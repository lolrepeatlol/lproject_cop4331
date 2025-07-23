import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/cupertino.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'services/sound_api.dart';
import 'models/sound.dart';
import 'extras/cupertino_toast.dart';
import 'package:flutter/material.dart' show CircularProgressIndicator, AlwaysStoppedAnimation;
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:jwt_decode/jwt_decode.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
    required this.userId,
    required this.jwtToken,
  });

  final VoidCallback onLogout;
  final String firstName;
  final String lastName;
  final String userId;
  final String jwtToken;

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final List<Sound?> _grid = List.filled(8, null);
  bool _loadingGrid = true;
  String? _message;
  late final StreamSubscription<void> _gridSub;

  final _searchCtl = TextEditingController();
  int? _slot;
  Timer? _debounce;
  final _player = AudioPlayer();

  Sound? _nowPlaying;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  final ValueNotifier<List<Sound>> _searchNotifier = ValueNotifier([]);

  static const _baseUrl = 'http://ucfgroup4.xyz';

  @override
  void initState() {
    super.initState();
    _loadGrid();
    _gridSub = SoundApi.onGridChanged.listen((_) => _loadGrid());
    _player.onDurationChanged.listen((d) => setState(() => _duration = d));
    _player.onPositionChanged.listen((p) => setState(() => _position = p));
    _player.onPlayerComplete.listen((_) =>
        setState(() {
          _nowPlaying = null;
          _duration = _position = Duration.zero;
        }));
  }

  @override
  void dispose() {
    _gridSub.cancel();
    _searchNotifier.dispose();
    _searchCtl.dispose();
    _player.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  double _progressFor(Sound s) {
    if (_nowPlaying != s || _duration.inMilliseconds == 0) return 0;
    return _position.inMilliseconds / _duration.inMilliseconds;
  }

  void _setApiError(String err) {
    setState(() => _message = err);
    showCupertinoDialog(
      context: context,
      builder: (_) =>
          CupertinoAlertDialog(
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
    _saveGrid();
  }

  void _clear(int slot) {
    setState(() => _grid[slot] = null);
    _saveGrid();
  }

  Future<void> _togglePlay(Sound s) async {
    final audioUri = Uri.parse(_baseUrl).resolve(s.path).toString();

    // Tap again → stop
    if (_nowPlaying == s) {
      await _player.stop();
      setState(() {
        _nowPlaying = null;
        _duration = Duration.zero;
        _position = Duration.zero;
      });
      return;
    }

    // Otherwise start new preview
    try {
      await _player.stop();
      await _player.play(UrlSource(audioUri));

      // grab the track length immediately
      final d = await _player.getDuration(); // may be null for a live/stream
      setState(() {
        _nowPlaying = s;
        _duration = d ?? Duration.zero; // default to zero if unknown
        _position = Duration.zero;
      });
    } catch (e) {
      _setApiError('Audio playback failed: $e');
    }
  }

  Future<void> _pickAndUpload() async {
    // 1. Pick the file
    final res = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['wav', 'mp3', 'ogg', 'm4a'],
    );
    if (!mounted || res == null || res.files.isEmpty) return;
    final file = File(res.files.single.path!);

    // 2. Show uploading toast
    showCupertinoToast(context, 'Uploading…');

    Sound newSound;
    try {
      newSound = await SoundApi.uploadSound(
        audioFile: file,
        userId: widget.userId,
        jwtToken: widget.jwtToken,
      );
    } catch (e) {
      if (!mounted) return;
      showCupertinoToast(context, '${e.toString()}');
      return;
    }

    if (!mounted) return;

    // Add to grid
    try {
      await SoundApi.addSoundToFirstEmptySlot(newSound);
    } catch (e) {
      // e.g. no empty slot left
      showCupertinoToast(
          context, 'Uploaded, but couldn’t add to library: ${e.toString()}');
      return;
    }

    // ─── THEN refresh & notify ───
    _loadGrid();
    showCupertinoToast(
      context,
      'Uploaded “${newSound.name}” and added to your library!',
    );
  }

  Widget _listItem(int i) {
    final s = _grid[i];
    final even = i % 2 == 0;
    final bgColor = even ? const Color(0xFF27272D) : const Color(0xFF1C1C22);
    final playBase = even ? const Color(0xFF3E3E47) : const Color(
        0xFF34343E); // define playBase

    return AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: s != null
            ? Dismissible(
          key: ValueKey('filled-$i'),
          direction: DismissDirection.endToStart,
          resizeDuration: null,
          onDismissed: (_) => _clear(i),
          background: Container(
            color: CupertinoColors.systemRed,
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 20),
            child: const Text(
              'Remove',
              style: TextStyle(color: CupertinoColors.white, fontSize: 16),
            ),
          ),
          child: _LibraryCard(
            key: ValueKey('card-$i'),
            sound: s,
            isPlaying: _nowPlaying == s,
            progress: _progressFor(s),
            onPlay: () => _togglePlay(s),
            cardColor: bgColor,
            playBaseColor: playBase,
          ),
        )
            : Container(
          key: ValueKey('empty-$i'),
          height: 90,
          width: double.infinity,
          color: bgColor,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              // extra indent
              const SizedBox(width: 16),

              // icon @ 70% opacity
              Opacity(
                opacity: 0.7,
                child: PhosphorIcon(
                  PhosphorIcons.empty(),
                  size: 28,
                  color: CupertinoColors.white,
                ),
              ),
              const SizedBox(width: 14),

              // Free space text, light italic, 70% opacity
              const Opacity(
                opacity: 0.7,
                child: Text(
                  'Free space',
                  style: TextStyle(
                    color: CupertinoColors.white,
                    fontSize: 24,
                    fontFamily: 'PlusJakartaSans',
                    fontWeight: FontWeight.w400,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),

              // keep right alignment for the Add button
              const Spacer(),

              // Add button with extra right padding
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Opacity(
                  opacity: 0.7,
                  child: CupertinoButton(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    onPressed: () => _open(i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: playBase.withAlpha(179), // 70% opacity
                        borderRadius: BorderRadius.circular(50),
                      ),
                      child: const Text(
                        'Add',
                        style: TextStyle(
                          color: CupertinoColors.white,
                          fontSize: 18,
                          fontFamily: 'PlusJakartaSans',
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        )
    );
  }

  Widget _modal() {
    return CupertinoPopupSurface(
      child: SizedBox(
        height: MediaQuery
            .of(context)
            .size
            .height * 0.7,
        child: Column(
          children: [
            // Stack header: title centered, close button top-right, same Y
            Stack(
              children: [
                // Centered title (fills width, centers text)
                Container(
                  alignment: Alignment.center,
                  height: 54, // enough to fit both title and button nicely
                  child: Text(
                    'Add sound to slot ${_slot! + 1}',
                    style: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontWeight: FontWeight.w700,
                      fontSize: 22,
                      color: CupertinoColors.white,
                    ),
                  ),
                ),
                // Absolutely positioned close button
                Positioned(
                  top: 0,
                  right: 16,
                  bottom: 0,
                  child: CupertinoButton(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Icon(
                      CupertinoIcons.xmark_circle_fill,
                      color: CupertinoColors.systemGrey,
                      size: 32,
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: CupertinoSearchTextField(
                controller: _searchCtl,
                style: const TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  color: CupertinoColors.white,
                ),
                placeholderStyle: const TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  color: CupertinoColors.systemGrey,
                ),
                onChanged: (v) {
                  _debounce?.cancel();
                  _debounce = Timer(
                      const Duration(milliseconds: 400), () => _search(v));
                },
              ),
            ),
            Expanded(
              child: ValueListenableBuilder<List<Sound>>(
                valueListenable: _searchNotifier,
                builder: (_, results, __) {
                  if (results.isEmpty) {
                    return const Center(
                      child: Text(
                        'No results',
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: CupertinoColors.systemGrey,
                          fontSize: 18,
                        ),
                      ),
                    );
                  }
                  return ListView.separated(
                    padding: EdgeInsets.zero,
                    itemCount: results.length,
                    separatorBuilder: (_, __) =>
                        Container(
                          height: 1,
                          color: CupertinoColors.systemGrey.withOpacity(0.3),
                        ),
                    itemBuilder: (_, idx) {
                      final s = results[idx];
                      return CupertinoButton(
                        padding: const EdgeInsets.symmetric(vertical: 10,
                            horizontal: 16),
                        onPressed: () {
                          Navigator.pop(context);
                          _assign(s);
                        },
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            s.name,
                            style: const TextStyle(
                              fontFamily: 'PlusJakartaSans',
                              color: CupertinoColors.white,
                              fontSize: 20,
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    // decode name from JWT
    final claims    = Jwt.parseJwt(widget.jwtToken);
    final firstName = (claims['firstName'] as String?) ?? '';
    final lastName  = (claims['lastName']  as String?) ?? '';
    final displayName = (firstName.isNotEmpty || lastName.isNotEmpty)
        ? '$firstName $lastName'
        : 'User #${widget.userId}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Text(
            'Logged in as $displayName',
            style: const TextStyle(
              color: CupertinoColors.systemGrey,
              fontSize: 14,
              fontFamily: 'PlusJakartaSans',
            ),
          ),
          const SizedBox(height: 8),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: widget.onLogout,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF3A3A3C),     // darker gray
                borderRadius: BorderRadius.circular(32),
              ),
              child: const Text(
                'Log out',
                style: TextStyle(
                  color: CupertinoColors.white,
                  fontSize: 16,
                  fontFamily: 'PlusJakartaSans',
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),

          const SizedBox(height: 200), // extra padding for scrolling
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewPadding.bottom; // home‐indicator area

    return CupertinoPageScaffold(
      child: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            // ── main content: spinner or list ──
            if (_loadingGrid)
              const Center(child: CupertinoActivityIndicator())
            else
              ListView.builder(
                padding: const EdgeInsets.only(top: 80),
                // +1 header, +8 slots, +optional message, +1 footer
                itemCount: 1 + 8 + (_message != null ? 1 : 0) + 1,
                itemBuilder: (context, idx) {
                  if (idx == 0) {
                    // header
                    return Padding(
                      padding: const EdgeInsets.only(top: 24, bottom: 40),
                      child: Text(
                        'Your sounds',
                        textAlign: TextAlign.center,
                        style: CupertinoTheme.of(context)
                            .textTheme
                            .textStyle
                            .copyWith(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  }

                  // slots 1–8
                  if (idx >= 1 && idx <= 8) {
                    return _listItem(idx - 1);
                  }

                  // optional error/message
                  final msgIndex = 1 + 8;
                  if (_message != null && idx == msgIndex) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        _message!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: CupertinoColors.systemRed),
                      ),
                    );
                  }

                  // footer (logout, padding)
                  final footerIndex = 1 + 8 + (_message != null ? 1 : 0);
                  if (idx == footerIndex) {
                    return _buildFooter();
                  }

                  return const SizedBox.shrink();
                },
              ),

            // ── FAB scoped to Library tab only ──
            Positioned(
              right: 32,
              bottom: bottomInset + 50 + 32, // tabBarHeight (50) + margin (32)
              child: CupertinoButton(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                onPressed: _pickAndUpload,
                child: Container(
                  padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF943872),
                    borderRadius: BorderRadius.circular(32),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      PhosphorIcon(
                        PhosphorIcons.uploadSimple(),
                        size: 24,
                        color: CupertinoColors.white,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Upload',
                        style: TextStyle(
                          color: CupertinoColors.white,
                          fontSize: 18,
                          fontFamily: 'PlusJakartaSans',
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryCard extends StatelessWidget {
  const _LibraryCard({
    Key? key,
    required this.sound,
    required this.onPlay,
    required this.isPlaying,
    required this.progress,
    required this.cardColor,
    required this.playBaseColor,
  }) : super(key: key);

  final Sound sound;
  final VoidCallback onPlay;
  final bool isPlaying;
  final double progress;
  final Color cardColor;
  final Color playBaseColor;

  static const _defaultPlayOn = Color(0xFFAD73A4);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 90,
      width: double.infinity,
      color: cardColor,
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16),
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              onPressed: onPlay,
              child: _circleButton(),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                sound.name,
                style:
                const TextStyle(color: CupertinoColors.white, fontSize: 24),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton() {
    final bg = isPlaying ? _defaultPlayOn : playBaseColor;

    return SizedBox(
      width: 60,
      height: 60,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
          ),
          if (isPlaying)
            SizedBox(
              width: 54,
              height: 54,
              child: CircularProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                strokeWidth: 4,
                backgroundColor: const Color(0x00000000),
                valueColor:
                const AlwaysStoppedAnimation(CupertinoColors.white),
              ),
            ),
          PhosphorIcon(
            isPlaying ? PhosphorIcons.stop() : PhosphorIcons.play(),
            size: 26,
            color: CupertinoColors.white,
          ),
        ],
      ),
    );
  }
}