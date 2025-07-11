import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final VoidCallback onLogout;
  final String firstName;
  final String lastName;

  const HomeScreen({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: onLogout,
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome, $firstName $lastName!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            const Text('You are now logged in.'),
          ],
        ),
      ),
    );
  }
}