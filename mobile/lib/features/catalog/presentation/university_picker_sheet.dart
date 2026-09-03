import 'package:flutter/material.dart';

import '../../../core/constants/nigerian_universities.dart';
import '../../../core/theme/app_colors.dart';

/// Shows a searchable picker for the 140+ Nigerian universities.
///
/// Resolves to:
/// - `null` if the sheet was dismissed without a choice (caller keeps state)
/// - `''` if the user explicitly picked "All universities" (caller clears filter)
/// - a university name otherwise
Future<String?> showUniversityPicker(BuildContext context, {String? current}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => _UniversityPickerSheet(current: current),
  );
}

class _UniversityPickerSheet extends StatefulWidget {
  const _UniversityPickerSheet({required this.current});

  final String? current;

  @override
  State<_UniversityPickerSheet> createState() => _UniversityPickerSheetState();
}

class _UniversityPickerSheetState extends State<_UniversityPickerSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _query.isEmpty
        ? nigerianUniversities
        : nigerianUniversities
            .where((u) => u.toLowerCase().contains(_query.toLowerCase()))
            .toList();

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.85,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 14, 20, 10),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Select university', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search universities',
                  prefixIcon: Icon(Icons.search, size: 20),
                ),
                onChanged: (value) => setState(() => _query = value),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: filtered.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return ListTile(
                      title: const Text('All universities'),
                      trailing: widget.current == null ? const Icon(Icons.check, color: AppColors.primary) : null,
                      onTap: () => Navigator.pop(context, ''),
                    );
                  }
                  final u = filtered[index - 1];
                  return ListTile(
                    title: Text(u),
                    trailing: widget.current == u ? const Icon(Icons.check, color: AppColors.primary) : null,
                    onTap: () => Navigator.pop(context, u),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
