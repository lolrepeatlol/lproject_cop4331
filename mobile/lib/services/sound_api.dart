import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/sound.dart';
import 'dart:async';
import 'session.dart';

class SoundApi {
  static const _baseUrl   = 'http://ucfgroup4.xyz';
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

    // ← **ADD THIS** so that removes (and any manual saves) also notify listeners:
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
}
