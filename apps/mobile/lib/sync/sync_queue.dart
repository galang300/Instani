import '../local_db/price_draft_store.dart';
import '../services/api_client.dart';

class SyncQueue {
  SyncQueue(this.store, this.apiClient);

  final PriceDraftStore store;
  final ApiClient apiClient;

  Future<int> flush() async {
    final drafts = await store.all();
    for (final draft in drafts) {
      await apiClient.submitPrice(draft);
    }
    return drafts.length;
  }
}
