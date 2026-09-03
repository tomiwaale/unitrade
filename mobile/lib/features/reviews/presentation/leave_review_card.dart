import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/review_providers.dart';

/// Mirrors app/orders/[id]/leave-review.tsx — mounted on the order detail
/// screen once status is `confirmed` and the buyer hasn't reviewed yet.
class LeaveReviewCard extends ConsumerStatefulWidget {
  const LeaveReviewCard({super.key, required this.orderId, required this.onSubmitted});

  final String orderId;
  final VoidCallback onSubmitted;

  @override
  ConsumerState<LeaveReviewCard> createState() => _LeaveReviewCardState();
}

class _LeaveReviewCardState extends ConsumerState<LeaveReviewCard> {
  final _commentController = TextEditingController();
  int _rating = 0;
  bool _submitting = false;
  bool _done = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a star rating')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await ref.read(reviewRepositoryProvider).submitReview(widget.orderId, _rating, _commentController.text);
      if (mounted) {
        setState(() => _done = true);
        widget.onSubmitted();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: const [
              Icon(Icons.check_circle_outline, color: AppColors.primaryInk),
              SizedBox(width: 10),
              Text('Review submitted — thank you!'),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Leave a review', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            Row(
              children: List.generate(5, (i) {
                final star = i + 1;
                return IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () => setState(() => _rating = star),
                  icon: Icon(
                    star <= _rating ? Icons.star : Icons.star_border,
                    color: star <= _rating ? Colors.amber : AppColors.inkMute,
                    size: 30,
                  ),
                );
              }),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _commentController,
              maxLength: 500,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Share your experience (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Submitting…' : 'Submit review'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
