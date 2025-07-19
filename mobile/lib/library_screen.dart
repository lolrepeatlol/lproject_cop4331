import 'package:flutter/cupertino.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class LibraryScreen extends StatelessWidget {
  final VoidCallback onLogout;
  final String firstName;
  final String lastName;

  const LibraryScreen({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Library'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: onLogout,
          child: PhosphorIcon(
            PhosphorIcons.userCircleGear(),
            size: 28,
            color: const Color(0xFF943872),
          ),
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome, $firstName $lastName!',
              style: CupertinoTheme.of(context).textTheme.navLargeTitleTextStyle,
            ),
            const SizedBox(height: 24),
            const Text('You are now logged in.'),
          ],
        ),
      ),
    );
  }
}