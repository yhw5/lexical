#import "RNLexicalNativeFrontend.h"

#import <react/renderer/components/LexicalReactNativeFrontendSpecs/ComponentDescriptors.h>
#import <react/renderer/components/LexicalReactNativeFrontendSpecs/EventEmitters.h>
#import <react/renderer/components/LexicalReactNativeFrontendSpecs/Props.h>
#import <react/renderer/components/LexicalReactNativeFrontendSpecs/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"
#import "LexicalRNTextView.h"
#import "LexicalRNTextStorage.h"

using namespace facebook::react;

@interface LexicalReactNativeFrontend () <RCTRNLexicalNativeFrontendViewProtocol, LexicalRNTextViewDelegate>
@end

@implementation LexicalReactNativeFrontend {
  RNTextView *_textView;
}

- (void)insertText:(NSString *)text location:(NSInteger)location
{
  [_textView.textStorage replaceCharactersInRange:NSMakeRange(location, 0) withString:text];
}
- (void)deleteText:(NSInteger)location length:(NSInteger)length
{
  [_textView.textStorage replaceCharactersInRange:NSMakeRange(location, length) withString:@""];
}
- (void)startEditing
{
  [_textView.textStorage beginEditing];
}
- (void)endEditing
{
  [_textView.textStorage endEditing];
}

inline std::string StringFromNSString(NSString *string)
{
  return std::string{string.UTF8String ?: ""};
}

- (void)rn_insertText:(NSString *)text;
{
  NSRange prevSel = _textView.selectedRange;
  std::static_pointer_cast<RNLexicalNativeFrontendEventEmitter const>(_eventEmitter)->onInsertTextHandler({
    .text = StringFromNSString(text)
  });
  std::static_pointer_cast<RNLexicalNativeFrontendEventEmitter const>(_eventEmitter)->onSelectionChangedHandler({
    .location = (int)(prevSel.location + text.length),
    .length = 0
  });

}

- (void)rn_selectionChange:(NSRange)selection;
{
  std::static_pointer_cast<RNLexicalNativeFrontendEventEmitter const>(_eventEmitter)->onSelectionChangedHandler({
    .location = (int)selection.location,
    .length = (int)selection.length
  });
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLexicalNativeFrontendComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLexicalNativeFrontendProps>();
    _props = defaultProps;

    _textView = [[LexicalRNTextView alloc] init];
    _textView.rn_delegate = self;

    self.contentView = _textView;
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<RNLexicalNativeFrontendProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<RNLexicalNativeFrontendProps const>(props);

//  if (oldViewProps.text != newViewProps.text) {
    //    _label.text = [[NSString alloc] initWithCString:newViewProps.text.c_str() encoding:NSASCIIStringEncoding];
//  }

  [super updateProps:props oldProps:oldProps];
}

- (void)handleCommand:(NSString *)commandName args:(NSArray *)args
{
  RCTLexicalReactNativeFrontendHandleCommand(self, commandName, args);
}

@end

Class<RCTComponentViewProtocol> LexicalReactNativeFrontendCls(void)
{
  return LexicalReactNativeFrontend.class;
}
