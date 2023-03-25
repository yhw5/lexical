#import <React/RCTLog.h>
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>
#import <React/RCTDefines.h>

@interface LexicalReactNativeFrontendManager : RCTViewManager
@end

@implementation LexicalReactNativeFrontendManager

RCT_EXPORT_MODULE(LexicalReactNativeFrontend)

RCT_EXPORT_VIEW_PROPERTY(onSelectionChangedHandler, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onInsertTextHandler, RCTDirectEventBlock)


@end
