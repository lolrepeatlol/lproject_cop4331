import 'package:flutter/cupertino.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('About'),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Boardy',
                  style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle,
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'v1.0.0',
                  style: TextStyle(
                    color: CupertinoColors.systemGrey,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Boardy is a customizable soundboard app. '
                    'Assign your favorite sounds, organize your library, and discover new audio!',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 32),
              const Text(
                'Developed by UCF Group 4',
                style: TextStyle(
                  fontSize: 15,
                  color: CupertinoColors.systemGrey2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
