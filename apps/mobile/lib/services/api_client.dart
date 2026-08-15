import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({this.baseUrl = 'http://localhost:4000'});

  final String baseUrl;

  Future<void> submitPrice(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/harga/reports'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode >= 400) {
      throw Exception('Gagal mengirim harga');
    }
  }
}
