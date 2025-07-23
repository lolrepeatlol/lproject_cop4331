import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/auth_service.dart';
import 'login_page.dart';
import 'library_screen.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

void main() => runApp(const MyApp());

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool    isLoggedIn = false;
  String? jwtToken, firstName, lastName;
  int?    userId;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final storedToken = prefs.getString('jwtToken');
    setState(() {
      isLoggedIn = (prefs.getBool('isLoggedIn') ?? false) && storedToken != null;
      jwtToken   = storedToken;
      firstName  = prefs.getString('firstName');
      lastName   = prefs.getString('lastName');
      userId     = prefs.getInt('userId');
    });
  }

  Future<void> _loginCallback({
    required String login,
    required String password,
  }) async {
    final data = await AuthService.login(login, password);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('jwtToken', data['jwtToken'] as String);
    await prefs.setString('firstName', data['firstName'] as String);
    await prefs.setString('lastName', data['lastName'] as String);
    await prefs.setInt('userId', data['id'] as int);

    setState(() {
      isLoggedIn = true;
      jwtToken   = data['jwtToken'] as String;
      firstName  = (data['firstName'] as String?) ?? '';
      lastName   = (data['lastName']  as String?) ?? '';
      userId     = data['id'] as int;
    });
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    setState(() => isLoggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoApp(
      title: 'Boardy',
      theme: CupertinoThemeData(
        brightness: Brightness.dark,
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
          // Add more as needed (pickerTextStyle, actionTextStyle, etc.)
        ),
      ),
      home: isLoggedIn
          ? HomePage(
        onLogout: _logout,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
      )
          : LoginPage(onLogin: _loginCallback),
    );
  }
}

class HomePage extends StatefulWidget {
  final VoidCallback onLogout;
  final String firstName;
  final String lastName;

  const HomePage({
    super.key,
    required this.onLogout,
    required this.firstName,
    required this.lastName,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 1; // Library as default

  @override
  Widget build(BuildContext context) {
    return CupertinoTabScaffold(
      tabBar: CupertinoTabBar(
        activeColor: const Color(0xFF943872),
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        items: [
          BottomNavigationBarItem(
            icon: SizedBox(
              height: 40,
              child: Center(
                child: PhosphorIcon(PhosphorIcons.listMagnifyingGlass()),
              ),
            ),
            label: 'Discover',
          ),
          BottomNavigationBarItem(
            icon: SizedBox(
              height: 40,
              child: Center(
                child: PhosphorIcon(PhosphorIcons.waveform()),
              ),
            ),
            label: 'Library',
          ),
          BottomNavigationBarItem(
            icon: SizedBox(
              height: 40,
              child: Center(
                child: PhosphorIcon(PhosphorIcons.info()),
              ),
            ),
            label: 'About',
          ),
        ],
      ),
      tabBuilder: (context, index) {
        switch (index) {
          case 0:
            return const DiscoverScreen();
          case 1:
            return LibraryScreen(
              onLogout: widget.onLogout,
              firstName: widget.firstName,
              lastName: widget.lastName,
            );
          case 2:
            return const AboutScreen();
          default:
            return const DiscoverScreen();
        }
      },
    );
  }
}

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Discover'),
      ),
      child: const Center(child: Text('Discover Page')),
    );
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('About'),
      ),
      child: const Center(child: Text('About Page')),
    );
  }
}