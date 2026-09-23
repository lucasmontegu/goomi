Pod::Spec.new do |s|
  s.name = 'GoomiScreenTime'
  s.version = '1.0.0'
  s.summary = 'Private, on-device Goomi Screen Time interventions'
  s.description = 'Family Controls authorization, selection, shields, and usage-based unlocks.'
  s.author = 'Goomi'
  s.homepage = 'https://goomi.app'
  s.platforms = { :ios => '17.4' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity', 'SwiftUI'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
