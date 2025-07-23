import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/sound.dart';
import 'dart:async';
import 'session.dart';
import 'dart:io';
import 'package:mime/mime.dart';
import 'package:http_parser/http_parser.dart';

class SoundApi {
  static const _baseUrl = 'http://ucfgroup4.xyz';
  static final _gridRefreshController = StreamController<void>.broadcast();
  static Stream<void> get onGridChanged => _gridRefreshController.stream;

  // Grid
  static Future<List<Sound?>> fetchGrid() async {
    final uid = await Session.uid();
    if (uid == null) return List.filled(8, null);

    final resp = await http.post(
      Uri.parse('$_baseUrl/api/getGridLayout'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'UserID': uid, 'jwtToken': await Session.token()}),
    );
    final data = jsonDecode(resp.body);
    if (resp.statusCode != 200) throw Exception(
        data['error'] ?? 'HTTP ${resp.statusCode}');

    final layout = (data['layout'] as List?) ?? [];
    await Session.maybeSaveToken(data);
    return List.generate(
      8,
          (i) =>
      (i < layout.length && layout[i] != null)
          ? Sound.fromJson(layout[i])
          : null,
    );
  }

  static Future<void> saveGrid(List<Sound?> grid) async {
    final uid = await Session.uid();
    if (uid == null) return;

    final resp = await http.post(
      Uri.parse('$_baseUrl/api/saveGridLayout'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'UserID': uid,
        'jwtToken': await Session.token(),
        'layout': grid.map((e) => e?.toJson()).toList(),
      }),
    );
    await Session.maybeSaveToken(jsonDecode(resp.body));

    _gridRefreshController.add(null);
  }

  // Search
  static Future<List<Sound>> search(String query) async {
    if (query.isEmpty) return [];

    final uid = await Session.uid();
    if (uid == null) return [];

    final resp = await http.post(
      Uri.parse('$_baseUrl/api/searchSounds'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'UserID': uid, 'search': query, 'jwtToken': await Session.token()}),
    );
    final data = jsonDecode(resp.body);
    await Session.maybeSaveToken(data);

    if (resp.statusCode != 200) throw Exception(data['error'] ?? 'HTTP ${resp.statusCode}');

    final list = (data['results'] as List?) ?? [];
    return list.map((e) => Sound.fromJson(e)).toList();
  }

  static Future<void> addSoundToFirstEmptySlot(Sound s) async {
    final grid = await fetchGrid();
    final idx = grid.indexWhere((e) => e == null);
    if (idx == -1) throw Exception('Your grid is full');
    grid[idx] = s;
    await saveGrid(grid);
    _gridRefreshController.add(null); // notify listeners
  }

  static Future<Sound> uploadSound({
    required File audioFile,
    required String userId,
    required String jwtToken,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/uploadSound');
    final req = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $jwtToken'
      ..fields['UserID']   = userId
      ..fields['jwtToken'] = jwtToken;

    final mimeType = lookupMimeType(audioFile.path) ?? 'audio/wav';
    req.files.add(await http.MultipartFile.fromPath(
      'soundFile',
      audioFile.path,
      contentType: MediaType.parse(mimeType),
    ));

    final streamedResp = await req.send();
    final body = await streamedResp.stream.bytesToString();
    final status = streamedResp.statusCode;

    // SUCCESS: any 2xx
    if (status >= 200 && status < 300) {
      try {
        final json = jsonDecode(body) as Map<String, dynamic>;
        await Session.maybeSaveToken(json);
        return Sound.fromJson(json['newSound'] as Map<String, dynamic>);
      } catch (_) {
        throw Exception('Invalid server response');
      }
    }

    // FAILURE: try to pull server’s "error" field
    String serverError;
    try {
      final err = jsonDecode(body) as Map<String, dynamic>;
      serverError = err['error'] as String? ?? '';
    } catch (_) {
      serverError = '';
    }

    // Map common status codes
    String message;
    switch (status) {
      case 401:
        message = serverError.isNotEmpty
            ? serverError
            : 'Invalid or expired session. Please log in again.';
        break;
      case 413:
        message = serverError.isNotEmpty
            ? serverError
            : 'Sound too long – must be 5 seconds or less.';
        break;
      case 500:
        message = serverError.isNotEmpty
            ? serverError
            : 'Server error during upload. Please try again later.';
        break;
      default:
      // covers 400 (no file, bad type, etc.) and any other codes
        message = serverError.isNotEmpty
            ? serverError
            : 'Upload failed (HTTP $status).';
    }

    throw Exception(message);
  }

}
