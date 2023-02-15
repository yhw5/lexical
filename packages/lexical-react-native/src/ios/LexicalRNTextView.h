
#import <UIKit/UIKit.h>

@protocol LexicalRNTextViewDelegate <NSObject>
- (void)rn_insertText:(NSString *)text;
- (void)rn_selectionChange:(NSRange)selection;
@end

@interface LexicalRNTextView: UITextView

@property (nonatomic, weak) id<LexicalRNTextViewDelegate> rn_delegate;

@end
