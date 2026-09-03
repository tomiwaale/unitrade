import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/mobile_api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/image_compression.dart';
import '../auth/application/auth_providers.dart';
import '../reviews/application/review_providers.dart';
import '../wishlist/presentation/wishlist_modal.dart';
import 'application/profile_providers.dart';
import 'data/profile_repository.dart';
import 'presentation/edit_profile_sheet.dart';

/// Mirrors app/profile/page.tsx: who you are, how you're doing as a seller,
/// and the settings screens that don't warrant their own bottom-nav tab.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _uploadingAvatar = false;
  bool _deletingAccount = false;

  Future<void> _changeAvatar(String userId) async {
    if (_uploadingAvatar) return;

    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 800);
    if (picked == null) return;

    setState(() => _uploadingAvatar = true);
    try {
      final repository = ref.read(profileRepositoryProvider);
      final bytes = await compressImageBytes(await picked.readAsBytes());
      final url = await repository.uploadAvatar(bytes);

      final current = await repository.fetchProfile(userId);
      await repository.updateProfile(
        fullName: current.fullName,
        university: current.university,
        phone: current.phone,
        avatarUrl: url,
      );
      ref.invalidate(profileProvider(userId));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't update your photo. Please try again.")),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _editProfile(UserProfile profile) async {
    final saved = await showEditProfileSheet(context, profile: profile);
    if (saved == true) {
      ref.invalidate(profileProvider(profile.id));
    }
  }

  Future<void> _deleteAccount() async {
    if (_deletingAccount) return;

    final confirmed = await _showDeleteAccountDialog();
    if (confirmed != true || !mounted) return;

    setState(() => _deletingAccount = true);
    try {
      await ref.read(profileRepositoryProvider).deleteAccount();
      await ref.read(authRepositoryProvider).signOut();
    } on MobileApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't delete your account. Please try again.")),
        );
      }
    } finally {
      if (mounted) setState(() => _deletingAccount = false);
    }
  }

  Future<bool?> _showDeleteAccountDialog() {
    final controller = TextEditingController();
    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) {
          final canDelete = controller.text.trim().toUpperCase() == 'DELETE';
          return AlertDialog(
            title: const Text('Delete your account?'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'This permanently removes your profile, listings, and messages. '
                  'Past orders are kept for legal record-keeping with your details removed. '
                  'This cannot be undone.',
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  autofocus: true,
                  decoration: const InputDecoration(hintText: 'Type DELETE to confirm'),
                  onChanged: (_) => setDialogState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: canDelete ? () => Navigator.of(dialogContext).pop(true) : null,
                child: const Text('Delete', style: TextStyle(color: Colors.red)),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authRepositoryProvider).currentUser;

    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final profileAsync = ref.watch(profileProvider(user.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          profileAsync.maybeWhen(
            data: (profile) => IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit profile',
              onPressed: () => _editProfile(profile),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(profileProvider(user.id));
          ref.invalidate(profileStatsProvider(user.id));
          ref.invalidate(sellerRatingProvider(user.id));
        },
        child: ListView(
          children: [
            _ProfileHeader(
              profile: profileAsync.value,
              email: user.email,
              uploading: _uploadingAvatar,
              onChangeAvatar: () => _changeAvatar(user.id),
            ),
            _StatsRow(userId: user.id),
            const SizedBox(height: 8),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.storefront_outlined),
              title: const Text('My listings'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/my-listings'),
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('Orders'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/orders'),
            ),
            ListTile(
              leading: const Icon(Icons.favorite_border),
              title: const Text('Wishlist'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => WishlistModal.show(context),
            ),
            ListTile(
              leading: const Icon(Icons.verified_outlined),
              title: const Text('Verification'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/kyc'),
            ),
            ListTile(
              leading: const Icon(Icons.account_balance_outlined),
              title: const Text('Payout account'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/payout'),
            ),
            ListTile(
              leading: const Icon(Icons.notifications_none),
              title: const Text('Notifications'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/notifications'),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.delete_forever_outlined, color: Colors.red),
              title: const Text('Delete account', style: TextStyle(color: Colors.red)),
              trailing: _deletingAccount
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : null,
              onTap: _deletingAccount ? null : _deleteAccount,
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(24),
              child: OutlinedButton(
                onPressed: () => ref.read(authRepositoryProvider).signOut(),
                child: const Text('Sign out'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.profile,
    required this.email,
    required this.uploading,
    required this.onChangeAvatar,
  });

  /// Null while the profile row is still loading — the header still renders
  /// so the screen doesn't jump once it arrives.
  final UserProfile? profile;
  final String? email;
  final bool uploading;
  final VoidCallback onChangeAvatar;

  @override
  Widget build(BuildContext context) {
    final name = profile?.fullName;
    final initial = (name?.trim().isNotEmpty ?? false) ? name!.trim()[0].toUpperCase() : '?';

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Stack(
            children: [
              Container(
                width: 92,
                height: 92,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primaryTint,
                ),
                clipBehavior: Clip.antiAlias,
                child: profile?.avatarUrl != null
                    ? CachedNetworkImage(imageUrl: profile!.avatarUrl!, fit: BoxFit.cover)
                    : Center(
                        child: Text(
                          initial,
                          style: const TextStyle(
                            fontSize: 34,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryInk,
                          ),
                        ),
                      ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Material(
                  color: AppColors.primary,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: uploading ? null : onChangeAvatar,
                    child: Padding(
                      padding: const EdgeInsets.all(7),
                      child: uploading
                          ? const SizedBox(
                              width: 15,
                              height: 15,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.camera_alt_outlined, size: 15, color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            name ?? '—',
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              if (profile?.university.isNotEmpty ?? false)
                _Chip(
                  icon: Icons.school_outlined,
                  label: profile!.university,
                  background: AppColors.backgroundSunken,
                  foreground: AppColors.inkSoft,
                ),
              if (profile?.isVerified ?? false)
                const _Chip(
                  icon: Icons.verified,
                  label: 'Verified',
                  background: AppColors.primaryTint,
                  foreground: AppColors.primaryInk,
                ),
            ],
          ),
          if (email != null) ...[
            const SizedBox(height: 8),
            Text(email!, style: const TextStyle(color: AppColors.inkMute, fontSize: 12.5)),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.icon,
    required this.label,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: foreground),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: foreground),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends ConsumerWidget {
  const _StatsRow({required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(profileStatsProvider(userId)).value;
    final rating = ref.watch(sellerRatingProvider(userId)).value;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.line),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            _Stat(value: stats?.activeListings, label: 'Listings'),
            _Stat(value: stats?.itemsSold, label: 'Sold'),
            _Stat(value: stats?.swaps, label: 'Swaps'),
            _Stat(
              // A seller with no reviews has no rating, which is different
              // from a rating of zero.
              display: rating == null
                  ? null
                  : rating.average != null
                      ? rating.average!.toStringAsFixed(1)
                      : '—',
              label: 'Rating',
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({this.value, this.display, required this.label});

  final int? value;
  final String? display;
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = display ?? value?.toString();

    return Expanded(
      child: Column(
        children: [
          SizedBox(
            height: 24,
            child: text == null
                ? const Center(
                    child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : Text(
                    text,
                    style: const TextStyle(
                      fontFamily: 'GeistMono',
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          ),
          const SizedBox(height: 3),
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.inkMute)),
        ],
      ),
    );
  }
}
