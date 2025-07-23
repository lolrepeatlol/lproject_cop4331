import 'package:flutter/cupertino.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'dart:ui';
import 'models/sound.dart';
import 'services/sound_api.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  late Future<Map<String, Sound>> _soundsByName;
  final _searchCtl = TextEditingController();
  final _searchFocus = FocusNode();

  static const _bg     = Color(0xFF0C0C0E);

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
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    _searchFocus.dispose();
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

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: _bg,
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
                                  cursorColor: const Color(0xFF943872),                        // white cursor
                                  prefix: Padding(
                                    padding: const EdgeInsets.only(left: 20, right: 12),
                                    child: PhosphorIcon(
                                      PhosphorIcons.magnifyingGlass(),
                                      color: Color(0x8FFFFFFF),  // white icon
                                      size: 20,
                                    ),
                                  ),
                                  style: const TextStyle(color: Color(0x8FFFFFFF)),          // white input text
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: const Color(0x8F000000),  // 50% opaque black background
                                    borderRadius: BorderRadius.circular(28),
                                  ),
                                  onChanged: (q) { /* … */ },
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Carousels
                  for (final cat in _categories) ...[
                    _buildCategory(cat, sounds),
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

    return _CategoryShelf(title: title, sounds: shelf);
  }
}

class _CategoryShelf extends StatelessWidget {
  const _CategoryShelf({required this.title, required this.sounds});
  final String title;
  final List<Sound> sounds;

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
              clipBehavior: Clip.none,           // ① allow painting outside bounds
              padding: const EdgeInsets.symmetric(horizontal: 16),
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemCount: sounds.length,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),  // ② vertical padding
                child: _SoundCard(sound: sounds[i]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SoundCard extends StatelessWidget {
  const _SoundCard({required this.sound});
  final Sound sound;

  static const _purple    = Color(0xFF943872);
  static const _cardColor = Color(0xFF2B2B31);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 300,
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: _purple.withAlpha(70),
            blurRadius: 10,
            spreadRadius: 5,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: Size.zero,
            onPressed: () {
              // TODO: preview/play
            },
            child: Container(
              width: 48,
              height: 48,
              margin: const EdgeInsets.only(left: 14),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF3E3E47),
              ),
              child: Center(
                child: PhosphorIcon(
                  PhosphorIcons.play(),
                  size: 20,
                  color: CupertinoColors.white,
                ),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding:
              const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                sound.name,
                style: const TextStyle(
                  color: CupertinoColors.white,
                  fontSize: 18,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: Size.zero,
            onPressed: () {
              // TODO: add to library
            },
            child: Container(
              width: 40,
              height: 40,
              margin: const EdgeInsets.only(right: 14),
              decoration: BoxDecoration(
                color: _purple,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: PhosphorIcon(
                  PhosphorIcons.plus(),
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
}