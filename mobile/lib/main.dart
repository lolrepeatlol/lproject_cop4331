import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'services/auth_service.dart';
import 'services/session.dart';
import 'library_screen.dart';
import 'discover_screen.dart';
import 'about_screen.dart';
import 'login_page.dart';

void main() => runApp(const MyApp());

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool    _loggedIn = false;
  String? _firstName, _lastName;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final hasToken = (await Session.token()).isNotEmpty;
    setState(() {
      _loggedIn   = hasToken;
      _firstName  = prefs.getString('firstName');
      _lastName   = prefs.getString('lastName');
    });
  }

  Future<void> _login({
    required String login,
    required String password,
  }) async {
    final data = await AuthService.login(login, password);
    setState(() {
      _loggedIn  = true;
      _firstName = data['firstName'] as String?;
      _lastName  = data['lastName']  as String?;
    });
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();              // clears jwt, uid, names
    setState(() => _loggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoApp(
      title: 'Boardy',
      theme: CupertinoThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0C0C0E),
        textTheme: CupertinoTextThemeData(
          textStyle: const TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontWeight: FontWeight.w500,
            fontSize: 16,
          ),
          navLargeTitleTextStyle: const TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 34,
            fontWeight: FontWeight.bold,
            color: CupertinoColors.white,
          ),
          navTitleTextStyle: const TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: CupertinoColors.white,
          ),
          tabLabelTextStyle: const TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: CupertinoColors.white,
          ),
        ),
      ),
      home: _loggedIn
          ? HomePage(
        onLogout: _logout,
        firstName: _firstName ?? '',
        lastName:  _lastName  ?? '',
      )
          : LoginPage(onLogin: _login),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
  });

  final VoidCallback onLogout;
  final String firstName;
  final String lastName;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _tab = 1; // Library default
  late final Future<List<String?>> _sessionFuture;

  @override
  void initState() {
    super.initState();
    _sessionFuture = Future.wait([Session.uid(), Session.token()]);
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoTabScaffold(
      tabBar: CupertinoTabBar(
        activeColor: const Color(0xFF943872),
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        items: [
          _item(PhosphorIcons.listMagnifyingGlass(), 'Discover'),
          _item(PhosphorIcons.waveform(),             'Library'),
          _item(PhosphorIcons.info(),                 'About'),
        ],
      ),
      tabBuilder: (_, index) {
        switch (index) {
          case 0:
            return const DiscoverScreen();
          case 1:
            return FutureBuilder<List<String?>>(
              future: _sessionFuture,          // ← SAME future every build
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CupertinoActivityIndicator());
                }
                if (snap.hasError || snap.data == null) {
                  return Center(
                    child: Text(
                      'Error loading session',
                      style: const TextStyle(color: CupertinoColors.systemRed),
                    ),
                  );
                }
                final userId   = snap.data![0]!;
                final jwtToken = snap.data![1]!;
                return LibraryScreen(
                  onLogout : widget.onLogout,
                  firstName: widget.firstName,
                  lastName : widget.lastName,
                  userId    : userId,
                  jwtToken  : jwtToken,
                );
              },
            );
          default:
            return const AboutScreen();
        }
      },
    );
  }

  BottomNavigationBarItem _item(IconData icon, String label) => BottomNavigationBarItem(
    icon: SizedBox(
      height: 40,
      child: Center(child: PhosphorIcon(icon)),
    ),
    label: label,
  );
}
