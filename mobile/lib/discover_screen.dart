import 'package:flutter/cupertino.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'dart:ui';
import 'dart:async';
import 'models/sound.dart';
import 'services/sound_api.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart' show CircularProgressIndicator, AlwaysStoppedAnimation;
import 'extras/cupertino_toast.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  late Future<Map<String, Sound>> _soundsByName;
  final _searchCtl = TextEditingController();
  final _searchFocus = FocusNode();
  final _player = AudioPlayer();
  Sound? _nowPlaying;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  bool _gridFull = false;
  StreamSubscription<void>? _gridSub;
  String?                 _searchQuery;
  Future<List<Sound>>?    _searchFuture;
  List<Sound>? _recommended;

  static const _categories = [
    {
      'title': 'Sounds of nostalgia',
      'soundNames': [
        'PS3 Startup',
        'Windows XP Shutdown',
        'Wii Start',
        'Roblox Oof',
      ],
    },
    {
      'title': 'Celebratory vibes',
      'soundNames': ['Confetti', 'Yippee', 'Firework', 'Crowd Cheer'],
    },
    {
      'title': 'Sports',
      'soundNames': ['NFL Fox', 'Wii Sports', 'UCF Chant', 'MLB Fox'],
    },
  ];

  @override
  void initState() {
    super.initState();

    _soundsByName = _fetchAllCategorySounds();
    _refreshGridStatus();
    _gridSub = SoundApi.onGridChanged.listen((_) => _refreshGridStatus());

    // duration of the current asset
    _player.onDurationChanged.listen((d) => setState(() => _duration = d));

    // current playback position
    _player.onPositionChanged.listen((p) => setState(() => _position = p));

    // reset when the track finishes
    _player.onPlayerComplete.listen((_) => setState(() {
      _nowPlaying  = null;
      _duration    = Duration.zero;
      _position    = Duration.zero;
    }));
  }

  Future<void> _preview(Sound s) async {
    // stop if the same sound is tapped again
    if (_nowPlaying?.name == s.name) {
      await _player.stop();
      setState(() => _nowPlaying = null);
      return;
    }

    final url = Uri.parse('http://ucfgroup4.xyz').resolve(s.path).toString();
    try {
      await _player.stop();
      await _player.play(UrlSource(url));
      final d = await _player.getDuration();
      setState(() {
        _nowPlaying = s;
        _duration   = d ?? Duration.zero;
        _position   = Duration.zero; // reset position
      });
    } catch (e) {
      _showError('Audio playback failed: $e');
    }
  }

  Future<void> _addToLibrary(Sound s) async {
    try {
      await SoundApi.addSoundToFirstEmptySlot(s);
      if (!mounted) return;
      showCupertinoToast(context, 'Added “${s.name}” to your library'); // we still have context here
    } catch (e) {
      _showError(e.toString());
    }
  }

  void _showError(String msg) => showCupertinoDialog(
    context: context,
    builder: (_) => CupertinoAlertDialog(
        title: const Text('Oops: An error occurred'),
        content: Text(msg),
        actions: [CupertinoDialogAction(
            child: const Text('OK'), onPressed: () => Navigator.pop(context))]
    ),
  );

  @override
  void dispose() {
    _searchCtl.dispose();
    _searchFocus.dispose();
    _player.dispose();
    _gridSub?.cancel();
    super.dispose();
  }

  Future<Map<String, Sound>> _fetchAllCategorySounds() async {
    final names = <String>{
      for (final cat in _categories)
        ...((cat['soundNames'] as List<String>).map((e) => e.toLowerCase()))
    };
    final map = <String, Sound>{};
    for (final name in names) {
      try {
        final results = await SoundApi.search(name);
        if (results.isNotEmpty) map[name] = results.first;
      } catch (_) {}
    }
    return map;
  }

  Future<void> _refreshGridStatus() async {
    final grid = await SoundApi.fetchGrid();
    setState(() => _gridFull = !grid.contains(null));  // true when every slot is filled
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      child: SafeArea(
        top: false,
        child: FutureBuilder<Map<String, Sound>>(
          future: _soundsByName,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CupertinoActivityIndicator());
            }
            if (snap.hasError) {
              return Center(
                child: Text(
                  'Error: ${snap.error}',
                  style: const TextStyle(color: CupertinoColors.systemRed),
                ),
              );
            }

            final sounds = snap.data ?? {};

            // —— initialize our 6 random recommendations once ——
            _recommended ??= (sounds.values.toList()..shuffle()).take(6).toList();
            final recommended = _recommended!;

            return GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () {
                // unconditionally blur whatever has focus
                FocusManager.instance.primaryFocus?.unfocus();
              },
              child: ListView(
                padding: EdgeInsets.zero,
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                children: [
                  // ─────────── Banner ───────────
                  Container(
                    height: 300,
                    decoration: const BoxDecoration(
                      image: DecorationImage(
                        image: AssetImage('assets/banner.jpg'),
                        fit: BoxFit.cover,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16).copyWith(top: 120),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'Find your next sound',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: CupertinoColors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              shadows: [
                                Shadow(
                                  color: Color(0x33000000), // softer, more transparent black
                                  blurRadius: 24,           // more blur for a soft glow
                                  offset: Offset(0, 6),     // gentle downward offset
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 30),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(28), // fully rounded corners
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                                child: CupertinoTextField(
                                  controller: _searchCtl,
                                  focusNode: _searchFocus,
                                  placeholder: 'Search',
                                  placeholderStyle: const TextStyle(color: Color(0x8FFFFFFF)), // white placeholder
                                  cursorColor: const Color(0xFF943872),  // white cursor
                                  prefix: Padding(
                                    padding: const EdgeInsets.only(left: 20, right: 12),
                                    child: PhosphorIcon(
                                      PhosphorIcons.magnifyingGlass(),
                                      color: Color(0x8FFFFFFF), // white icon
                                      size: 20,
                                    ),
                                  ),
                                  style: const TextStyle(color: Color(0x8FFFFFFF)), // white input text
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0x8F000000), // 50% opaque black background
                                    borderRadius: BorderRadius.circular(28),
                                  ),
                                  onChanged: (q) {
                                    setState(() {
                                      _searchQuery = q.isEmpty ? null : q;
                                      _searchFuture = (q.isEmpty)
                                          ? null
                                          : SoundApi.search(q);
                                    });
                                  },
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // If there’s a non‐empty query, show live results instead of categories
                  if (_searchQuery != null)
                    FutureBuilder<List<Sound>>(
                      future: _searchFuture,
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(child: CupertinoActivityIndicator());
                        }
                        if (snap.hasError) {
                          return Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text('Search error: ${snap.error}',
                                style: const TextStyle(color: CupertinoColors.systemRed)),
                          );
                        }
                        final results = snap.data ?? [];
                        if (results.isEmpty) {
                          return const Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('No sounds found.',
                                style: TextStyle(color: CupertinoColors.inactiveGray)),
                          );
                        }
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(bottom: 12, top: 4),
                                child: Text(
                                  'Search results',
                                  style: TextStyle(
                                    color: CupertinoColors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              ...results.map((s) {
                                final playing = _nowPlaying?.name == s.name;
                                final progress = playing && _duration.inMilliseconds > 0
                                    ? _position.inMilliseconds / _duration.inMilliseconds
                                    : 0.0;
                                return SizedBox(
                                  height: 100,
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    child: _SoundCard(
                                      sound     : s,
                                      onPlay    : () => _preview(s),
                                      onAdd     : () => _addToLibrary(s),
                                      isPlaying : playing,
                                      progress  : progress,
                                      canAdd   : !_gridFull,
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        );
                      },
                    )
                  else ...[
                    // Recommended Sounds
                    _CategoryShelf(
                      title: 'Recommended sounds',
                      sounds: recommended,
                      onPlay    : _preview,
                      onAdd     : _addToLibrary,
                      nowPlaying: _nowPlaying,
                      duration  : _duration,
                      position  : _position,
                      canAdd    : !_gridFull,
                      addButtonColor  : const Color(0xFF3264B9),
                      addShadowColor  : const Color(0x663264B9),
                      playingCircleColor: const Color(0xFF5D80BD),
                    ),

                    // existing categories
                    for (final cat in _categories) ...[
                      _buildCategory(cat, sounds),
                    ],
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCategory(Map<String, Object> cat, Map<String, Sound> all) {
    final title = cat['title'] as String;
    final names =
    (cat['soundNames'] as List<String>).map((e) => e.toLowerCase());
    final shelf = [
      for (final n in names)
        if (all[n] != null) all[n]!
    ];
    if (shelf.isEmpty) return const SizedBox.shrink();

    return _CategoryShelf(
      title: title,
      sounds: shelf,
      onPlay: _preview,
      onAdd : _addToLibrary,
      nowPlaying : _nowPlaying,
      duration   : _duration,
      position   : _position,
      canAdd: !_gridFull,
    );
  }
}

class _CategoryShelf extends StatelessWidget {
  const _CategoryShelf({
    required this.title,
    required this.sounds,
    required this.onPlay,
    required this.onAdd,
    required this.nowPlaying,
    required this.duration,
    required this.position,
    required this.canAdd,
    this.addButtonColor,
    this.addShadowColor,
    this.circleColor,
    this.playingCircleColor,
  });

  final String title;
  final List<Sound> sounds;
  final void Function(Sound) onPlay;
  final void Function(Sound) onAdd;
  final Sound?   nowPlaying;
  final Duration duration;
  final Duration position;
  final bool canAdd; // true if the user can add sounds to their library

  final Color? addButtonColor; // optional custom color for the add button
  final Color? addShadowColor; // optional custom color for the shadow
  final Color? circleColor; // optional custom color for the play button circle
  final Color? playingCircleColor; // optional custom color for the playing circle

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category title…
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              title,
              style: const TextStyle(
                color: CupertinoColors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          // Horizontal list with overflow allowed
          SizedBox(
            height: 100, // make room for shadows above & below
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,           // allow painting outside bounds
              padding: const EdgeInsets.symmetric(horizontal: 16),
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemCount: sounds.length,
              itemBuilder: (_, i) {
                final s = sounds[i];
                final playing  = nowPlaying?.name == s.name;
                final progress = playing && duration.inMilliseconds > 0
                    ? position.inMilliseconds / duration.inMilliseconds
                    : 0.0;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: SizedBox(
                    width: 300,               // ← enforce 300px here
                    child: _SoundCard(
                      sound     : s,
                      onPlay    : () => onPlay(s),
                      onAdd     : () => onAdd(s),
                      isPlaying : playing,
                      progress  : progress,
                      canAdd   : canAdd,
                      addButtonColor: addButtonColor,
                      addShadowColor: addShadowColor,
                      circleColor: circleColor,
                      playingCircleColor: playingCircleColor,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SoundCard extends StatelessWidget {
  const _SoundCard({
    Key? key,
    required this.sound,
    required this.onPlay,
    required this.onAdd,
    required this.isPlaying,
    required this.progress,
    required this.canAdd,
    this.addButtonColor,
    this.addShadowColor,
    this.circleColor,
    this.playingCircleColor,
  });

  final Sound sound;
  final VoidCallback onPlay;
  final VoidCallback onAdd;
  final bool isPlaying;
  final double progress; // 0 – 1
  final bool canAdd; // true if the user can add sounds to their library

  final Color?  addButtonColor;
  final Color?  addShadowColor;
  final Color? circleColor;
  final Color? playingCircleColor;

  // Default colors
  static const _defaultAdd = Color(0xFF943872);
  static const _defaultPlayBase = Color(0xFF3E3E47);
  static const _defaultPlayOn = Color(0xFFAD73A4);
  static const _cardColor = Color(0xFF2B2B31);

  @override
  Widget build(BuildContext context) {
    final btnColor = canAdd
        ? (addButtonColor ?? _defaultAdd)
        : const Color(0xFF9D8494);

    final shadowClr = addShadowColor
        // if provided, use it; otherwise fallback to old purple‐shadow
        ?? const Color(0x64943872);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: shadowClr, // purple @ 40 % opacity
            blurRadius: 45,
            spreadRadius: 5,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // PLAY
          Padding(
            padding: const EdgeInsets.only(left: 14), // add left margin!
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              onPressed: onPlay,
              child: _circleButton(isPlaying, progress),
            ),
          ),

          // TITLE
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 15),
              child: Text(
                sound.name,
                style: const TextStyle(
                    color: CupertinoColors.white, fontSize: 18),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),

          // ADD BUTTON
          CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: Size.zero,
            onPressed: canAdd
                ? onAdd
                : () => showCupertinoToast(
              context,
              'Your library is full',
            ),
            child: Container(
              width: 40,
              height: 40,
              margin: const EdgeInsets.only(right: 14),
              decoration: BoxDecoration(
                color: btnColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: PhosphorIcon(
                  canAdd ? PhosphorIcons.plus() : PhosphorIcons.prohibit(),
                  size: 22,
                  color: CupertinoColors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton(bool playing, double progress) {
    final bg = isPlaying
        ? (playingCircleColor ?? _defaultPlayOn)
        : (circleColor        ?? _defaultPlayBase);

    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Base circle (same as original size)
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: bg,
            ),
          ),

          // Progress ring INSIDE the circle
          if (playing)
            SizedBox(
              width: 44,
              height: 44,
              child: CircularProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                strokeWidth: 4,
                backgroundColor: const Color(0x00000000),
                valueColor: AlwaysStoppedAnimation<Color>(
                  CupertinoColors.white,
                ),
              ),
            ),

          // Icon remains centered
          PhosphorIcon(
            playing
                ? PhosphorIcons.stop()
                : PhosphorIcons.play(),
            size: 20,
            color: CupertinoColors.white,
          ),
        ],
      ),
    );
  }
}