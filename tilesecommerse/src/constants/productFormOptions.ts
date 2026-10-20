// Shared option lists for product forms — used by both the manual
// create-product form (SimpleProductForm) and the PDF bulk-import editor,
// so the two stay in sync instead of drifting apart.

export const FINISH_TYPES = [
  'Glossy', 'High Gloss', 'Super Gloss', 'Matte', 'Satin', 'Polished',
  'Semi-Polished', 'Lappato', 'Mirror Finish', 'Brushed Finish',
  'Chrome Finish', 'Powder Coated', 'Painted', 'Enamel Coated',
  'Textured', 'Structured', 'Rustic', 'Anti-Skid', 'Sugar Finish',
  'Carving', '3D Finish', 'Wooden Finish', 'Marble Finish',
  'Granite Finish', 'Stone Finish', 'Cement Finish', 'Concrete Finish',
  'Metallic Finish', 'Digital Printed', 'Frosted', 'Transparent',
  'Opaque', 'White Finish', 'Black Finish', 'Silver Finish',
  'Gold Finish', 'Rose Gold Finish'
];

export const MATERIAL_TYPES = [
  'Ceramic', 'Glazed Ceramic', 'Porcelain', 'Vitrified', 'Double Charge Vitrified',
  'Full Body Vitrified', 'GVT (Glazed Vitrified Tiles)', 'PGVT (Polished Glazed Vitrified Tiles)',
  'Marble', 'Marble Look', 'Granite', 'Granite Look', 'Stone', 'Slate', 'Travertine',
  'Quartz', 'Wood Look', 'Cement Finish', 'Concrete Look', 'Mosaic', '3D Tiles',
  'Digital Wall Tiles', 'Elevation Tiles', 'Glass Tiles', 'Metallic Finish',
  'Outdoor Tiles', 'Parking Tiles', 'Anti-Skid Tiles', 'Paver Tiles',
  'Vitreous China', 'Stainless Steel', 'Mild Steel', 'Cast Iron', 'Brass',
  'Copper', 'Aluminium', 'Galvanized Iron (GI)', 'PVC', 'CPVC', 'UPVC',
  'HDPE', 'Plastic', 'ABS Plastic', 'FRP (Fibre Reinforced Plastic)',
  'Glass', 'Toughened Glass', 'Acrylic', 'Cement', 'Concrete', 'Wood',
  'Engineered Wood', 'Plywood', 'MDF', 'HDF', 'Laminated Board',
  'Solar Glass', 'Silicon (Solar Grade)', 'Rubber'
];

export const Unit = [
  'Box', 'Pcs', 'Sq.ft', 'Sq.m', 'Cartoon', 'MM', 'CM', 'Inches', 'Feet', 'Meters', 'Kg',
  'Gram', 'Set', 'Pair', 'ML', 'Litre', 'Bag', 'Bucket', 'Unit'
];

export interface TagOption {
  value: string;
  label: string;
  emoji: string;
}

// Quality/marketing tags shown on product cards.
export const TAG_OPTIONS: TagOption[] = [
  { value: 'popular', label: 'Popular', emoji: '⭐' },
  { value: 'trending', label: 'Trending', emoji: '🔥' },
  { value: 'new', label: 'New', emoji: '✨' },
  { value: 'premium', label: 'Premium', emoji: '💎' },
  { value: 'exclusive', label: 'Exclusive', emoji: '👑' },
  { value: 'classic', label: 'Classic', emoji: '🏛️' },
  { value: 'bestseller', label: 'Best Seller', emoji: '🏆' },
  { value: 'limited', label: 'Limited Edition', emoji: '⏰' },
];

// Applications / room types the product suits.
export const ROOM_TYPE_OPTIONS: TagOption[] = [
  { value: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { value: 'bathroom', label: 'Bathroom', emoji: '🚿' },
  { value: 'living-room', label: 'Living Room', emoji: '🛋️' },
  { value: 'bedroom', label: 'Bedroom', emoji: '🛏️' },
  { value: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { value: 'commercial', label: 'Commercial', emoji: '🏢' },
];

// Image upload constraints shared by every product image uploader.
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES = 10;
export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
