require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name            = "lexical-react-native"
  s.version         = package["version"]
  s.summary         = package["description"]
  s.description     = package["description"]
  s.homepage        = package["homepage"]
  s.license         = package["license"]
  s.platforms       = { :ios => "11.0" }
  s.author          = package["author"]
  s.source          = { :git => package["repository"], :tag => "#{s.version}" }

  s.source_files    = "src/ios/**/*.{h,m,mm,swift}"

  install_modules_dependencies(s)

  use_react_native_codegen!(s, {
    :library_name => "LexicalReactNativeSpec",
    :react_native_path => "../../../",
    :js_srcs_dir => "./src/js",
    :library_type => "components"
  })
end