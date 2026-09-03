import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_logo_mark.dart';
import '../../catalog/presentation/university_picker_sheet.dart';
import '../application/auth_providers.dart';
import '../application/validators.dart';
import '../data/auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _selectedUniversity;
  bool _universityTouched = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _pickUniversity() async {
    final picked = await showUniversityPicker(context, current: _selectedUniversity);
    if (picked == null) return; // dismissed without choice
    setState(() {
      _selectedUniversity = picked.isEmpty ? null : picked;
      _universityTouched = true;
    });
  }

  Future<void> _submit() async {
    setState(() => _universityTouched = true);
    if (!_formKey.currentState!.validate()) return;
    if (_selectedUniversity == null || _selectedUniversity!.isEmpty) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).register(
            RegisterInput(
              fullName: _fullNameController.text.trim(),
              email: _emailController.text.trim(),
              phone: _phoneController.text.trim(),
              password: _passwordController.text,
              university: _selectedUniversity!,
            ),
          );
      // Router redirect (see app_router.dart) takes over once authStateProvider emits.
    } on AuthRepositoryException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to create account. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUniversityError = _universityTouched && (_selectedUniversity == null || _selectedUniversity!.isEmpty);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(child: AppLogoMark()),
                const SizedBox(height: 20),
                Text('Create your account', style: Theme.of(context).textTheme.headlineLarge, textAlign: TextAlign.center),
                const SizedBox(height: 4),
                const Text(
                  'Buy, sell, and swap with students on your campus',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.inkMute),
                ),
                const SizedBox(height: 28),
                TextFormField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  textCapitalization: TextCapitalization.words,
                  autofillHints: const [AutofillHints.name],
                  validator: AuthValidators.fullName,
                ),
                const SizedBox(height: 14),
                // University — tappable picker (searchable 140+ university list)
                GestureDetector(
                  onTap: _pickUniversity,
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'University',
                      errorText: hasUniversityError ? 'Please select your university' : null,
                      suffixIcon: const Icon(Icons.keyboard_arrow_down),
                    ),
                    child: Text(
                      _selectedUniversity ?? '',
                      style: TextStyle(
                        color: _selectedUniversity != null ? AppColors.ink : AppColors.inkMute,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  validator: AuthValidators.email,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    hintText: '08012345678',
                  ),
                  keyboardType: TextInputType.phone,
                  autofillHints: const [AutofillHints.telephoneNumber],
                  validator: AuthValidators.phone,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  validator: AuthValidators.password,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 13)),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Create account'),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
