class PriceDraftStore {
  final List<Map<String, dynamic>> _drafts = [];

  Future<void> save(Map<String, dynamic> draft) async {
    _drafts.add({...draft, 'queuedAt': DateTime.now().toIso8601String()});
  }

  Future<List<Map<String, dynamic>>> all() async {
    return List.unmodifiable(_drafts);
  }
}
