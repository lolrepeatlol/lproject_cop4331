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
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Boardy',
                  textAlign: TextAlign.center,
                  style: CupertinoTheme.of(context)
                      .textTheme
                      .navLargeTitleTextStyle
                      .copyWith(fontSize: 42),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'v1.0.0',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: CupertinoColors.systemGrey,
                    fontSize: 20,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  'Your personal soundboard app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Text(
                  '- Assign your favorite sounds\n'
                      '- Organize your library\n'
                      '- Discover new audio',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18),
                ),
              ),
              const SizedBox(height: 32),
              Center(
                child: Text(
                  'Developed by:\n'
                      'Alexei Solonari\n'
                      'Jose Ojeda\n'
                      'Paul Bagaric\n'
                      'Li Fitzgerald\n'
                      'Jordan Khan',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: CupertinoColors.systemGrey2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}