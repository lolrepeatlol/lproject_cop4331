import 'dart:async';
import 'dart:convert';
import 'package:jwt_decode/jwt_decode.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/cupertino.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ────────────────────────────── Sound model ──────────────────────────────
class Sound {
  const Sound({
    required this.id,
    required this.name,
    required this.path,
    required this.isDefault,
    this.userId,
  });

  final String id;
  final String name;
  final String path;
  final bool isDefault;
  final String? userId;

  factory Sound.fromJson(Map<String, dynamic> j) {
    final raw = j['isDefault'];
    final isDefault = (raw is bool)
        ? raw
        : (raw?.toString().toLowerCase() == 'true');
    return Sound(
      id: j['_id'] as String,
      name: j['soundName'] as String,
      path: j['path'] as String,
      isDefault: isDefault,
      userId: j['UserID']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'soundName': name,
    'path': path,
    'isDefault': isDefault,
    'UserID': userId,
  };
}

/// ─────────────────────────── LibraryScreen widget ──────────────────────────
class LibraryScreen extends StatefulWidget {
  const LibraryScreen({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
  });

  final VoidCallback onLogout;
  final String firstName;
  final String lastName;

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  // 8-slot grid
  final List<Sound?> _grid = List.filled(8, null);
  bool _loadingGrid = true;
  String? _message;

  final _searchCtl = TextEditingController();
  int? _slot;
  Timer? _debounce;
  final _player = AudioPlayer();

  final ValueNotifier<List<Sound>> _searchNotifier = ValueNotifier([]);

  // ──────────── CONFIG ────────────
  static const _baseUrl = 'http://ucfgroup4.xyz';
  static const _purple = Color(0xFF943872);
  static const _tileColor = Color(0xFF27272D);

  // ──────────── Lifecycle ────────────
  @override
  void initState() {
    super.initState();
    _fetchGrid();
  }

  @override
  void dispose() {
    _searchNotifier.dispose();
    _searchCtl.dispose();
    _player.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  // ─────────── Shared-prefs helpers ───────────

  Future<String?> _uid() async {
    final prefs = await SharedPreferences.getInstance();

    // Try the cached value first
    final cached = prefs.getInt('userId');
    if (cached != null) return cached.toString();

    // Fallback: decode the JWT we already have
    final jwt = prefs.getString('jwtToken');
    if (jwt == null || jwt.isEmpty) return null;

    try {
      final claims = Jwt.parseJwt(jwt);

      // back-end might use any of these keys:
      final raw = claims['UserID'] ?? claims['userId'];
      if (raw == null) return null;

      final int id = raw is int ? raw : int.parse(raw.toString());

      // cache it so we never do this again
      await prefs.setInt('userId', id);
      return id.toString();
    } catch (_) {
      return null;
    }
  }

  Future<String> _token() async {
    final p = await SharedPreferences.getInstance();
    return p.getString('jwtToken') ?? '';
  }

  Future<void> _maybeSaveToken(dynamic json) async {
    if (json is Map && json['jwtToken'] is String && json['jwtToken'].toString().isNotEmpty) {
      final p = await SharedPreferences.getInstance();
      await p.setString('jwtToken', json['jwtToken']);
    }
  }

  // ─────────── UI error helper ───────────
  void _setApiError(String err) {
    setState(() => _message = err);
    showCupertinoDialog(
      context: context,
      builder: (_) => CupertinoAlertDialog(
        title: const Text('Server error'),
        content: Text(err),
        actions: [
          CupertinoDialogAction(
            child: const Text('OK'),
            onPressed: () => Navigator.pop(context),
          )
        ],
      ),
    );
  }

  // ─────────── API calls ───────────
  Future<void> _fetchGrid() async {
    final uid = await _uid();
    if (uid == null) return;

    try {
      final resp = await http.post(
        Uri.parse('$_baseUrl/api/getGridLayout'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'UserID': uid, 'jwtToken': await _token()}),
      );
      final data = jsonDecode(resp.body);

      if (resp.statusCode != 200 || data['error'] != null) {
        _setApiError(data['error']?.toString() ?? 'HTTP ${resp.statusCode}');
      } else {
        final layout = (data['layout'] as List?) ?? [];
        for (var i = 0; i < 8; i++) {
          _grid[i] = (i < layout.length && layout[i] != null) ? Sound.fromJson(layout[i]) : null;
        }
        await _maybeSaveToken(data);
      }
    } catch (e) {
      _setApiError(e.toString());
    } finally {
      setState(() => _loadingGrid = false);
    }
  }

  Future<void> _saveGrid() async {
    final uid = await _uid();
    if (uid == null) return;

    try {
      final resp = await http.post(
        Uri.parse('$_baseUrl/api/saveGridLayout'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'UserID': uid,
          'jwtToken': await _token(),
          'layout': _grid.map((e) => e?.toJson()).toList(),
        }),
      );
      await _maybeSaveToken(jsonDecode(resp.body));
    } catch (_) {}
  }

  Future<void> _search(String q) async {
    if (q.isEmpty) {
      _searchNotifier.value = [];    // ← clear results
      return;
    }
    final uid = await _uid();
    if (uid == null) {
      return;
    }

    final token = await _token();
    final body = {'UserID': uid, 'search': q, 'jwtToken': token};

    try {
      final resp = await http.post(
        Uri.parse('$_baseUrl/api/searchSounds'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      final data = jsonDecode(resp.body);

      await _maybeSaveToken(data);

      // Parse error for debug
      final errorMsg = (data['error'] as String?) ?? '';

      if (resp.statusCode == 200) {
        final list = (data['results'] as List?) ?? [];
        final sounds = list.map((e) => Sound.fromJson(e)).toList();
        _searchNotifier.value = sounds;  // Update notifier with results
      } else {
        _setApiError(errorMsg.isNotEmpty ? errorMsg : 'HTTP ${resp.statusCode}');
        _searchNotifier.value = [];
      }
    } catch (e) {
      _setApiError(e.toString());
      _searchNotifier.value = [];
    }
  }

  // ─────────── Actions ───────────
  void _open(int slot) {
    _slot = slot;
    _searchCtl.clear();
    showCupertinoModalPopup(context: context, builder: (_) => _modal());
  }

  void _assign(Sound s) {
    final slot = _slot;
    if (slot == null) return;               // guard
    setState(() {
      _grid[slot] = s;
      _slot = null;                          // clear it
    });
    _saveGrid();
  }

  void _clear(int slot) {
    setState(() => _grid[slot] = null);
    _saveGrid();
  }

  Future<void> _play(Sound s) async {
    // Parse your base URL once
    final baseUri = Uri.parse(_baseUrl);
    // Resolve the relative path against it (preserves http vs https)
    final audioUri = baseUri.resolve(s.path);
    try {
      await _player.play(UrlSource(audioUri.toString()));
    } catch (e) {
      _setApiError('Audio playback failed: $e');
    }
  }

  // ─────────── UI helpers ───────────
  Widget _tile(int i) {
    final s = _grid[i];
    return GestureDetector(
      onTap: s == null ? () => _open(i) : null,
      child: Container(
        decoration: BoxDecoration(color: _tileColor, borderRadius: BorderRadius.circular(12)),
        child: s == null
            ? const Center(
            child: Text('+', style: TextStyle(color: CupertinoColors.white, fontSize: 32)))
            : Stack(children: [
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () => _play(s),
                  child: PhosphorIcon(PhosphorIcons.playCircle(), size: 34, color: _purple),
                ),
                const SizedBox(height: 6),
                Text(s.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: CupertinoColors.white, fontSize: 14, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          Positioned(
            right: 6,
            top: 6,
            child: GestureDetector(
              onTap: () => _clear(i),
              child: const Icon(CupertinoIcons.clear_thick_circled,
                  size: 20, color: CupertinoColors.systemRed),
            ),
          )
        ]),
      ),
    );
  }

  Widget _modal() {
    return CupertinoPopupSurface(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Add sound to slot ${_slot! + 1}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: CupertinoColors.white,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: CupertinoSearchTextField(
                controller: _searchCtl,
                onChanged: (v) {
                  _debounce?.cancel();
                  _debounce = Timer(
                    const Duration(milliseconds: 400),
                        () => _search(v),
                  );
                },
              ),
            ),

            // ← here we swap out the direct _searchResults check
            Expanded(
              child: ValueListenableBuilder<List<Sound>>(
                valueListenable: _searchNotifier,
                builder: (context, results, _) {
                  if (results.isEmpty) {
                    return const Center(
                      child: Text(
                        'No results',
                        style: TextStyle(color: CupertinoColors.systemGrey),
                      ),
                    );
                  }
                  return ListView.separated(
                    itemCount: results.length,
                    separatorBuilder: (_, __) => Container(
                      height: 1,
                      color:
                      CupertinoColors.systemGrey.withOpacity(0.3),
                    ),
                    itemBuilder: (_, idx) {
                      final s = results[idx];
                      return CupertinoButton(
                        padding: const EdgeInsets.symmetric(
                            vertical: 10, horizontal: 16),
                        onPressed: () {
                          Navigator.pop(context);
                          _assign(s);
                        },
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            s.name,
                            style: const TextStyle(
                                color: CupertinoColors.white),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),

            CupertinoButton(
              child: const Text('Close'),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }


  // ─────────── build ───────────
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Library'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: widget.onLogout,
          child: PhosphorIcon(PhosphorIcons.userCircleGear(), size: 26, color: _purple),
        ),
      ),
      child: _loadingGrid
          ? const Center(child: CupertinoActivityIndicator())
          : Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Text('Welcome, ${widget.firstName} ${widget.lastName}!',
              style: CupertinoTheme.of(context)
                  .textTheme
                  .textStyle
                  .copyWith(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12),
              itemCount: 8,
              itemBuilder: (_, i) => _tile(i),
            ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 8),
            Text(_message!, style: const TextStyle(color: CupertinoColors.systemRed)),
          ]
        ]),
      ),
    );
  }
}