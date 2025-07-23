class Sound {
  const Sound({
    required this.id,
    required this.name,
    required this.path,
    required this.isDefault,
    this.userId,
  });

  final String id;
  final String name;
  final String path;
  final bool isDefault;
  final String? userId;

  factory Sound.fromJson(Map<String, dynamic> j) {
    final raw = j['isDefault'];
    final isDefault = (raw is bool) ? raw : (raw?.toString().toLowerCase() == 'true');
    return Sound(
      id: j['_id'] as String,
      name: j['soundName'] as String,
      path: j['path'] as String,
      isDefault: isDefault,
      userId: j['UserID']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'soundName': name,
    'path': path,
    'isDefault': isDefault,
    'UserID': userId,
  };
}
