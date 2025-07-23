import 'package:flutter/cupertino.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  final Future<void> Function({
  required String login,
  required String password,
  }) onLogin;

  const LoginPage({super.key, required this.onLogin});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String? _error;
  bool _loading = false;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.onLogin(
        login: _userCtrl.text.trim(),
        password: _passCtrl.text,
      );
      // on success, MyApp rebuilds to HomePage
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext ctx) {
    final media = MediaQuery.of(ctx);
    final verticalPadding = media.size.height * 0.20;

    return CupertinoPageScaffold(
      child: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: 20)
              .copyWith(top: verticalPadding, bottom: verticalPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Boardy title
              Padding(
                padding: const EdgeInsets.only(bottom: 60),
                child: Center(
                  child: Text(
                    'Boardy',
                    textAlign: TextAlign.center,
                    style: CupertinoTheme.of(context)
                        .textTheme
                        .navLargeTitleTextStyle
                        .copyWith(
                      color: CupertinoColors.white,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 64, // Very large
                    ),
                  ),
                ),
              ),
              CupertinoTextField(
                cursorColor: const Color(0xFF943872),
                controller: _userCtrl,
                placeholder: 'Login',
                textInputAction: TextInputAction.next,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w400,
                ),
              ),
              const SizedBox(height: 20),
              CupertinoTextField(
                cursorColor: const Color(0xFF943872),
                controller: _passCtrl,
                placeholder: 'Password',
                obscureText: true,
                textInputAction: TextInputAction.done,
                decoration: BoxDecoration(
                  color: const Color(0xFF27272D),
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    color: CupertinoColors.systemRed,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
              const SizedBox(height: 32),
              CupertinoButton(
                color: const Color(0xFF943872),
                borderRadius: BorderRadius.circular(999),      // ← here’s the pill shape
                padding: const EdgeInsets.symmetric(
                  horizontal: 24, vertical: 16,                // smaller padding = smaller height
                ),
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const CupertinoActivityIndicator()
                    : Text(
                  'Log in',
                  style: CupertinoTheme.of(context)
                      .textTheme
                      .textStyle
                      .copyWith(
                    color: CupertinoColors.white,
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 20,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _loading
                    ? null
                    : () => Navigator.of(ctx).push(
                  CupertinoPageRoute(
                    builder: (_) => const RegisterPage(),
                  ),
                ),
                child: Text(
                  'No account yet? Register here',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
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