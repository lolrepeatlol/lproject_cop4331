import 'package:flutter/cupertino.dart';
import 'services/auth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _fn = TextEditingController();
  final _ln = TextEditingController();
  final _login = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _confirm = TextEditingController();

  String? _message;
  bool _loading = false;

  bool _checkFields() {
    final firstName = _fn.text.trim();
    final lastName = _ln.text.trim();
    final email = _email.text.trim();
    final login = _login.text.trim();
    final password = _pass.text;

    if (firstName.isEmpty || lastName.isEmpty || email.isEmpty ||
        login.isEmpty || password.isEmpty) {
      setState(() => _message = 'All fields are required!');
      return false;
    }
    if (!(email.contains('@') && email.contains('.com'))) {
      setState(() =>
      _message =
      'Please make sure you are using a valid email IE: example@domain.com');
      return false;
    }
    if (password.length < 8) {
      setState(() => _message = 'Password must be at least 8 characters!');
      return false;
    }
    final special = RegExp(r'[!@#$%^&*()?]');
    if (!special.hasMatch(password)) {
      setState(() =>
      _message = 'Password must contain a special character Ex.(!@\$)');
      return false;
    }
    final upper = RegExp(r'[A-Z]');
    if (!upper.hasMatch(password)) {
      setState(() => _message = 'Password must contain a capital letter');
      return false;
    }
    if (password != _confirm.text) {
      setState(() => _message = "Passwords don't match");
      return false;
    }
    setState(() => _message = null);
    return true;
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
    });
    if (!_checkFields()) {
      setState(() {
        _loading = false;
      });
      return;
    }

    try {
      await AuthService.register(
        firstName: _fn.text.trim(),
        lastName: _ln.text.trim(),
        login: _login.text.trim(),
        password: _pass.text,
        email: _email.text.trim(),
      );
      setState(() {
        _message =
        'Registration successful! Please check your email for verification link.';
      });
      await Future.delayed(const Duration(milliseconds: 1500));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _message = e.toString());
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Register title
              Padding(
                padding: const EdgeInsets.only(bottom: 60, top: 40),
                child: Center(
                  child: Text(
                    'Register',
                    textAlign: TextAlign.center,
                    style: CupertinoTheme.of(context)
                        .textTheme
                        .navLargeTitleTextStyle
                        .copyWith(
                      color: CupertinoColors.white,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 42, // Not as huge as Boardy, but big!
                    ),
                  ),
                ),
              ),
              CupertinoTextField(
                controller: _fn,
                placeholder: 'First Name',
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: _ln,
                placeholder: 'Last Name',
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: _email,
                placeholder: 'Email',
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: _login,
                placeholder: 'Username',
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: _pass,
                placeholder: 'Password',
                obscureText: true,
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 12),
              CupertinoTextField(
                controller: _confirm,
                placeholder: 'Confirm Password',
                obscureText: true,
                textInputAction: TextInputAction.done,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                cursorColor: const Color(0xFF943872),
                style: CupertinoTheme
                    .of(context)
                    .textTheme
                    .textStyle
                    .copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'PlusJakartaSans',
                ),
              ),
              const SizedBox(height: 18),
              if (_message != null) ...[
                Text(
                  _message!,
                  style: TextStyle(
                    color: _message ==
                        'Registration successful! Please check your email for verification link.'
                        ? CupertinoColors.activeGreen
                        : CupertinoColors.systemRed,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'PlusJakartaSans',
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 14),
              ],
              CupertinoButton(
                color: const Color(0xFF943872),
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const CupertinoActivityIndicator()
                    : Text(
                  'Register',
                  style: CupertinoTheme
                      .of(context)
                      .textTheme
                      .textStyle
                      .copyWith(
                    color: CupertinoColors.white,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _loading ? null : () => Navigator.of(context).pop(),
                child: Text(
                  'Back to Login',
                  style: CupertinoTheme
                      .of(context)
                      .textTheme
                      .textStyle
                      .copyWith(
                    color: const Color(0xFF943872),
                    fontWeight: FontWeight.bold,
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 16,
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