
#import <UIKit/UIKit.h>
#import "RNTextView.h"
#import "RNTextStorage.h"

@interface LexicalRNTextView () <UITextViewDelegate>

@end

@implementation LexicalRNTextView

- (instancetype)init
{
    NSTextStorage *ts = [NSTextStorage new];
    NSLayoutManager *lm = [NSLayoutManager new];
    NSTextContainer *tc = [[NSTextContainer alloc] initWithSize:CGSizeMake(0, CGFLOAT_MAX)];

    [lm addTextContainer:tc];
    [ts addLayoutManager:lm];

    if (self = [super initWithFrame:CGRectZero textContainer:tc]) {
        self.delegate = self;
      self.autocorrectionType = UITextAutocorrectionTypeNo;
      self.autocapitalizationType = UITextAutocapitalizationTypeNone;
    }
    return self;
}

- (void)insertText:(NSString *)text
{
    [self.rn_delegate rn_insertText:text];
}

- (void)textViewDidChangeSelection:(UITextView *)textView
{
    [self.rn_delegate rn_selectionChange:self.selectedRange];
}

@end
