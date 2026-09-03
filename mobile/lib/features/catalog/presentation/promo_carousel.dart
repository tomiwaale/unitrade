import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../application/catalog_providers.dart';
import '../data/promo_slide.dart';

/// Auto-advancing promo banner, admin-managed at /admin/promo-slides on the
/// web app and read live from the `promo_slides` table.
class PromoCarousel extends ConsumerStatefulWidget {
  const PromoCarousel({super.key});

  @override
  ConsumerState<PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends ConsumerState<PromoCarousel> {
  final _controller = PageController();
  Timer? _timer;
  int _page = 0;
  int _timerSlideCount = -1;

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _ensureTimer(int slideCount) {
    if (slideCount == _timerSlideCount) return;
    _timerSlideCount = slideCount;
    _timer?.cancel();
    if (slideCount <= 1) return;
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final next = (_page + 1) % slideCount;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final slidesAsync = ref.watch(promoSlidesProvider);

    return slidesAsync.when(
      // Reserve the final height so content below doesn't jump once loaded.
      loading: () => const SizedBox(height: 168),
      error: (error, stack) => const SizedBox.shrink(),
      data: (slides) {
        if (slides.isEmpty) return const SizedBox.shrink();
        _ensureTimer(slides.length);

        return Column(
          children: [
            SizedBox(
              height: 152,
              child: PageView.builder(
                controller: _controller,
                itemCount: slides.length,
                onPageChanged: (index) => setState(() => _page = index),
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _PromoCard(slide: slides[index]),
                ),
              ),
            ),
            if (slides.length > 1) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < slides.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == _page ? 18 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: i == _page ? AppColors.accent : AppColors.line,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                ],
              ),
            ],
          ],
        );
      },
    );
  }
}

class _PromoCard extends StatelessWidget {
  const _PromoCard({required this.slide});

  final PromoSlide slide;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.backgroundSunken,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: slide.route == null ? null : () => context.go(slide.route!),
        child: slide.imageUrl != null
            ? _ImageOnlyCard(imageUrl: slide.imageUrl!, slide: slide)
            : _GradientCard(slide: slide),
      ),
    );
  }
}

/// A banner image, scaled to fit entirely within the card without cropping.
/// Falls back to the gradient card if the image fails to load.
class _ImageOnlyCard extends StatelessWidget {
  const _ImageOnlyCard({required this.imageUrl, required this.slide});

  final String imageUrl;
  final PromoSlide slide;

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      fit: BoxFit.contain,
      width: double.infinity,
      height: double.infinity,
      errorWidget: (context, url, error) => _GradientCard(slide: slide),
    );
  }
}

class _GradientCard extends StatelessWidget {
  const _GradientCard({required this.slide});

  final PromoSlide slide;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 12, 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [slide.colorStart, slide.colorEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  slide.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 17,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  slide.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12.5,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(
            iconForPromoSlide(slide),
            color: Colors.white.withValues(alpha: 0.85),
            size: 40,
          ),
        ],
      ),
    );
  }
}
