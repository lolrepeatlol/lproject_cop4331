import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/auth_service.dart';
import 'login_page.dart';
import 'home_screen.dart';

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
    // call API
    final data = await AuthService.login(login, password);

    // persist for auto-login
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('jwtToken', data['jwtToken'] as String);
    await prefs.setString('firstName', data['firstName'] as String);
    await prefs.setString('lastName', data['lastName'] as String);
    await prefs.setInt('userId', data['id'] as int);

    setState(() {
      isLoggedIn = true;
      jwtToken   = data['jwtToken'] as String;
      firstName = (data['firstName'] as String?) ?? '';
      lastName  = (data['lastName']  as String?) ?? '';
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
    return MaterialApp(
      title: 'Flutter Auth',
      theme: ThemeData(
        textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      ),
      home: isLoggedIn
          ? HomeScreen(
        onLogout: _logout,
        firstName: firstName ?? '',
        lastName : lastName  ?? '',
      )
          : LoginPage(onLogin: _loginCallback),
    );
  }
}