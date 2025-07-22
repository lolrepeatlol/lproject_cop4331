import 'package:flutter/cupertino.dart';
import '../models/sound.dart';
import '../services/sound_api.dart';

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('Discover')),
      child: FutureBuilder<List<Sound>>(
        future: SoundApi.search(''), // start empty or popular query
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CupertinoActivityIndicator());
          }
          final sounds = snap.data!;
          if (sounds.isEmpty) {
            return const Center(
              child: Text('No sounds found', style: TextStyle(color: CupertinoColors.systemGrey)),
            );
          }
          return ListView.separated(
            itemCount: sounds.length,
            separatorBuilder: (_, __) => Container(
              height: 1,
              color: CupertinoColors.systemGrey.withOpacity(0.2),
              margin: const EdgeInsets.symmetric(horizontal: 16),
            ),
            itemBuilder: (_, i) {
              final sound = sounds[i];
              return CupertinoButton(
                padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                pressedOpacity: 0.7,
                onPressed: () {
                  // TODO: Play, preview, or add sound to library
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        sound.name,
                        style: const TextStyle(
                          fontSize: 16,
                          color: CupertinoColors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(
                      CupertinoIcons.right_chevron,
                      color: CupertinoColors.systemGrey,
                      size: 20,
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
