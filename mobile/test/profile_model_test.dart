import 'package:flutter_test/flutter_test.dart';
import 'package:kolejswap_mobile/features/profile/data/profile_repository.dart';

void main() {
  Map<String, dynamic> row({bool nin = false, String schoolId = 'none'}) => {
        'id': 'u1',
        'full_name': 'Ada Obi',
        'university': 'University of Lagos',
        'phone': '08012345678',
        'avatar_url': null,
        'nin_verified': nin,
        'school_id_status': schoolId,
      };

  group('UserProfile.isVerified', () {
    test('false with neither check passed', () {
      expect(UserProfile.fromJson(row()).isVerified, isFalse);
    });

    test('true on a verified NIN', () {
      expect(UserProfile.fromJson(row(nin: true)).isVerified, isTrue);
    });

    test('true on an approved school ID', () {
      expect(UserProfile.fromJson(row(schoolId: 'approved')).isVerified, isTrue);
    });

    test('a pending school ID is not verification', () {
      expect(UserProfile.fromJson(row(schoolId: 'pending')).isVerified, isFalse);
    });
  });

  test('UserProfile tolerates a sparse row', () {
    final profile = UserProfile.fromJson({'id': 'u1'});
    expect(profile.fullName, 'Student');
    expect(profile.university, '');
    expect(profile.isVerified, isFalse);
  });
}
