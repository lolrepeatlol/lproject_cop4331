import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:jwt_decode/jwt_decode.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const _baseUrl = 'http://ucfgroup4.xyz';

  static Future<Map<String, dynamic>> login(
      String login,
      String password,
      ) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/api/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'login': login, 'password': password}),
    );

    final dynamic data = jsonDecode(resp.body);
    if (data is! Map) {
      throw Exception('Unexpected response structure: $data');
    }
    if (resp.statusCode != 200) {
      throw Exception(data['error'] ?? 'HTTP ${resp.statusCode}');
    }

    final token = data['accessToken'] as String?;
    if (token == null) throw Exception('login succeeded but no accessToken');

    // Decode the JWT to extract claims
    final claims    = Jwt.parseJwt(token);
    final id        = claims['UserID'] as int?;
    final firstName = claims['firstName'] as String?;
    final lastName  = claims['lastName'] as String?;

    // ─── Persist token + userId ───
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwtToken', token);
    if (id != null) {
      await prefs.setInt('userId', id);
    }

    return {
      'jwtToken' : token,
      'id'       : id,
      'firstName': firstName,
      'lastName' : lastName,
    };
  }

  /// Calls POST /api/register
  static Future<void> register({
    required String firstName,
    required String lastName,
    required String login,
    required String password,
    required String email,
  }) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/api/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firstName': firstName,
        'lastName' : lastName,
        'login'    : login,
        'password' : password,
        'email'    : email,
      }),
    );
    final data = jsonDecode(resp.body);
    if (resp.statusCode != 201) {
      throw Exception(data['error'] ?? 'Registration failed (${resp.statusCode})');
    }

    // if the server returns token + id right away, cache them:
    final prefs = await SharedPreferences.getInstance();
    final token = data['accessToken'] ?? data['jwtToken'];
    if (token != null && token.toString().isNotEmpty) {
      await prefs.setString('jwtToken', token);
    }
    final uid = data['UserID'] ?? data['userId'];
    if (uid != null) {
      await prefs.setInt('userId', uid is int ? uid : int.parse(uid.toString()));
    }
  }
}