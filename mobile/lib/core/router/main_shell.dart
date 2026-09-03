import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/notifications/application/notifications_providers.dart';
import '../../features/swaps/application/swap_providers.dart';
import '../theme/app_colors.dart';

/// Bottom-nav shell mirroring the web app's IA: Catalog, Swaps, Sell,
/// Messages, Profile, with dynamic unread/pending badges.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  Widget _buildIcon(IconData icon, int count) {
    if (count <= 0) return Icon(icon);
    return Badge.count(
      count: count,
      backgroundColor: AppColors.accent,
      textColor: Colors.white,
      textStyle: const TextStyle(
        fontFamily: 'GeistMono',
        fontSize: 10,
        fontWeight: FontWeight.w700,
      ),
      child: Icon(icon),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingSwapsCount = ref.watch(pendingSwapsCountProvider);
    final unreadMessagesCount = ref.watch(unreadMessagesCountProvider);

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        selectedItemColor: AppColors.primary,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.storefront_outlined),
            activeIcon: Icon(Icons.storefront),
            label: 'Catalog',
          ),
          BottomNavigationBarItem(
            icon: _buildIcon(Icons.swap_horiz_outlined, pendingSwapsCount),
            activeIcon: _buildIcon(Icons.swap_horiz, pendingSwapsCount),
            label: 'Swaps',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Sell',
          ),
          BottomNavigationBarItem(
            icon: _buildIcon(Icons.chat_bubble_outline, unreadMessagesCount),
            activeIcon: _buildIcon(Icons.chat_bubble, unreadMessagesCount),
            label: 'Messages',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
