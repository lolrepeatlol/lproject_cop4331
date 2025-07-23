import 'package:jwt_decode/jwt_decode.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Session {
  static const _uidKey  = 'userId';
  static const _jwtKey  = 'jwtToken';

  static Future<String?> uid() async {
    final p = await SharedPreferences.getInstance();
    final cached = p.getInt(_uidKey);
    if (cached != null) return cached.toString();

    final jwt = p.getString(_jwtKey);
    if (jwt == null || jwt.isEmpty) return null;

    try {
      final claims = Jwt.parseJwt(jwt);
      final raw = claims['UserID'] ?? claims['userId'];
      if (raw == null) return null;
      final id = raw is int ? raw : int.parse(raw.toString());

      await p.setInt(_uidKey, id); // cache for next time
      return id.toString();
    } catch (_) {
      return null;
    }
  }

  static Future<String> token() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_jwtKey) ?? '';
  }

  static Future<void> maybeSaveToken(dynamic json) async {
    if (json is Map && json['jwtToken'] is String && (json['jwtToken'] as String).isNotEmpty) {
      final p = await SharedPreferences.getInstance();
      await p.setString(_jwtKey, json['jwtToken']);
    }
  }
}
