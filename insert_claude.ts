import { db } from './src/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const claudeProduct = {
  name: 'Claude Pro',
  description: `اشتراك Claude Pro (حساب شخصي) يوفر وصولاً متقدماً إلى نموذج Claude 3 Opus، وهو أقوى وأذكى نموذج ذكاء اصطناعي من شركة Anthropic، مصمم للتفكير المتقدم، تحليل البيانات المعقدة، والبرمجة باحترافية عالية.

✨ مميزات اشتراك Claude Pro:
• أولوية الوصول: استخدام أسرع للموقع حتى في أوقات الذروة.
• وصول كامل إلى Claude 3 Opus و Sonnet 3.5.
• حد استخدام مضاعف (5x) مقارنة بالحساب المجاني.
• نافذة سياق ضخمة (Context Window) تتيح معالجة مستندات، أكواد، وتحليلات تصل إلى 200,000 توكن (حوالي كتاب كامل).
• مثالي للمبرمجين، الباحثين، والكتاب المحترفين بفضل دقة الإجابات وقلة الهلوسة.

كيفية التفعيل:
الاشتراك يتم تفعيله على حسابك الشخصي بشكل آمن ورسمي. بعد الدفع، سيتم تفعيل الباقة مباشرة في حسابك.`,
  category: 'اشتراكات',
  price: 5900,
  image: 'https://infinitystoredz.com/images/products/claude-pro.png',
  imageUrl: 'https://infinitystoredz.com/images/products/claude-pro.png',
  active: true,
  createdAt: Date.now(),
  hasVariants: true,
  variants: [
    {
      id: 'var_claude_1',
      name: 'Claude Pro — شهر',
      price: 5900,
      image: '/images/game-coin.jpg'
    },
    {
      id: 'var_claude_2',
      name: 'Claude Max ( x5 Pro usage ) — شهر',
      price: 28900,
      image: '/images/game-coin.jpg'
    },
    {
      id: 'var_claude_3',
      name: 'Claude Max ( x20 Pro usage ) — شهر',
      price: 59000,
      image: '/images/game-coin.jpg'
    }
  ],
  priceUnspecified: false
};

async function insertProduct() {
  try {
    const docRef = await addDoc(collection(db, 'products'), claudeProduct);
    console.log('Product added successfully with ID:', docRef.id);
    process.exit(0);
  } catch (err) {
    console.error('Error adding product:', err);
    process.exit(1);
  }
}

insertProduct();