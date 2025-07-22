import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/cupertino.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'services/sound_api.dart';
import 'models/sound.dart';

// LibraryScreen widget
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

  // CONFIG
  static const _baseUrl = 'http://ucfgroup4.xyz';
  static const _purple = Color(0xFF943872);
  static const _tileColor = Color(0xFF27272D);

  // Lifecycle
  @override
  void initState() {
    super.initState();
    _loadGrid();
  }

  @override
  void dispose() {
    _searchNotifier.dispose();
    _searchCtl.dispose();
    _player.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  // UI error helper
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

  // API calls
  Future<void> _loadGrid() async {
    try {
      final grid = await SoundApi.fetchGrid();
      setState(() => _grid.setAll(0, grid));
    } catch (e) {
      _setApiError(e.toString());
    } finally {
      setState(() => _loadingGrid = false);
    }
  }

  Future<void> _saveGrid() => SoundApi.saveGrid(_grid);

  Future<void> _search(String q) async {
    // clear results but don’t return a value
    if (q.isEmpty) {
      _searchNotifier.value = [];
      return;
    }

    try {
      _searchNotifier.value = await SoundApi.search(q);
    } catch (e) {
      _setApiError(e.toString());
      _searchNotifier.value = [];
    }
  }

  // Actions
  void _open(int slot) {
    _slot = slot;
    _searchCtl.clear();
    showCupertinoModalPopup(context: context, builder: (_) => _modal());
  }

  void _assign(Sound s) {
    final slot = _slot;
    if (slot == null) return;
    setState(() {
      _grid[slot] = s;
      _slot = null;
    });
    SoundApi.saveGrid(_grid);
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

  // UI helpers
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


  // build
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