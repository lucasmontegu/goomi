Pod::Spec.new do |s|
  s.name = 'GoomiStudy'
  s.version = '1.0.0'
  s.summary = 'Private PDF and image study text extraction'
  s.description = 'On-device PDFKit and Vision text extraction for Goomi study materials.'
  s.author = 'Goomi'
  s.homepage = 'https://goomi.app'
  s.platforms = { :ios => '17.4' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PDFKit', 'Vision', 'UIKit', 'ImageIO'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
