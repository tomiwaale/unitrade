import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/payout_providers.dart';
import '../data/payout_repository.dart';

class PayoutScreen extends ConsumerStatefulWidget {
  const PayoutScreen({super.key});

  @override
  ConsumerState<PayoutScreen> createState() => _PayoutScreenState();
}

class _PayoutScreenState extends ConsumerState<PayoutScreen> {
  bool _editing = false;

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(payoutStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Payout account')),
      body: statusAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: OutlinedButton(
            onPressed: () => ref.invalidate(payoutStatusProvider),
            child: const Text('Retry'),
          ),
        ),
        data: (status) {
          final hasPayout = status.bankName != null;
          if (hasPayout && !_editing) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.account_balance_outlined, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(status.bankName!, style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(
                                  '${status.accountName ?? ''} · ${status.accountNumber ?? ''}',
                                  style: const TextStyle(color: AppColors.inkMute, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: () => setState(() => _editing = true), child: const Text('Change account')),
                ],
              ),
            );
          }
          return _PayoutForm(onSaved: () => setState(() => _editing = false));
        },
      ),
    );
  }
}

class _PayoutForm extends ConsumerStatefulWidget {
  const _PayoutForm({required this.onSaved});

  final VoidCallback onSaved;

  @override
  ConsumerState<_PayoutForm> createState() => _PayoutFormState();
}

class _PayoutFormState extends ConsumerState<_PayoutForm> {
  final _accountNumberController = TextEditingController();
  Bank? _selectedBank;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _accountNumberController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedBank == null) {
      setState(() => _error = 'Select a bank');
      return;
    }
    if (_accountNumberController.text.trim().length != 10) {
      setState(() => _error = 'Account number must be 10 digits');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(payoutRepositoryProvider).save(
            bankCode: _selectedBank!.code,
            bankName: _selectedBank!.name,
            accountNumber: _accountNumberController.text.trim(),
          );
      ref.invalidate(payoutStatusProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payout account saved!')));
        widget.onSaved();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final banksAsync = ref.watch(banksProvider);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Set up your bank account to receive payouts when buyers confirm receipt of your items.',
            style: TextStyle(color: AppColors.inkMute, fontSize: 13),
          ),
          const SizedBox(height: 20),
          banksAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => const Text("Couldn't load bank list", style: TextStyle(color: AppColors.destructive)),
            data: (banks) => DropdownButtonFormField<Bank>(
              initialValue: _selectedBank,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Bank'),
              items: [
                for (final bank in banks) DropdownMenuItem(value: bank, child: Text(bank.name)),
              ],
              onChanged: (v) => setState(() => _selectedBank = v),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _accountNumberController,
            decoration: const InputDecoration(labelText: 'Account number'),
            keyboardType: TextInputType.number,
            maxLength: 10,
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 12)),
            ),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? 'Verifying account…' : 'Save payout account'),
          ),
        ],
      ),
    );
  }
}
