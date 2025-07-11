import 'package:flutter/material.dart';
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

  // Field validation just like in the web code
  bool _checkFields() {
    final firstName = _fn.text.trim();
    final lastName = _ln.text.trim();
    final email = _email.text.trim();
    final login = _login.text.trim();
    final password = _pass.text;

    if (firstName.isEmpty || lastName.isEmpty || email.isEmpty || login.isEmpty || password.isEmpty) {
      setState(() => _message = 'All fields are required!');
      return false;
    }
    if (!(email.contains('@') && email.contains('.com'))) {
      setState(() => _message = 'Please make sure you are using a valid email IE: example@domain.com');
      return false;
    }
    if (password.length < 8) {
      setState(() => _message = 'Password must be at least 8 characters!');
      return false;
    }
    final special = RegExp(r'[!@#$%^&*()?]');
    if (!special.hasMatch(password)) {
      setState(() => _message = 'Password must contain a special character Ex.(!@\$)');
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
    setState(() { _loading = true; });
    if (!_checkFields()) {
      setState(() { _loading = false; });
      return;
    }

    try {
      await AuthService.register(
        firstName: _fn.text.trim(),
        lastName : _ln.text.trim(),
        login    : _login.text.trim(),
        password : _pass.text,
        email    : _email.text.trim(),
      );
      // Registration succeeded!
      setState(() {
        _message = 'Registration successful! Please check your email for verification link.';
      });
      await Future.delayed(const Duration(seconds: 1, milliseconds: 500));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _message = e.toString());
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext ctx) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: _fn, decoration: const InputDecoration(labelText: 'First Name')),
              const SizedBox(height: 8),
              TextField(controller: _ln, decoration: const InputDecoration(labelText: 'Last Name')),
              const SizedBox(height: 8),
              TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 8),
              TextField(controller: _login, decoration: const InputDecoration(labelText: 'Username')),
              const SizedBox(height: 8),
              TextField(controller: _pass, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
              const SizedBox(height: 8),
              TextField(controller: _confirm, decoration: const InputDecoration(labelText: 'Confirm Password'), obscureText: true),
              const SizedBox(height: 12),
              if (_message != null) ...[
                Text(_message!, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 12),
              ],
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Register'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _loading
                    ? null
                    : () => Navigator.of(context).pop(),
                child: const Text('Back to Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}