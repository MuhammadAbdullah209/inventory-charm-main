import { Bill } from "../Models/Billing_Schema.js";
import { Product } from "../Models/Product_Model.js";

//  Status 200
export const createProduct = async (req, res) => {
    try {
        const { name, category, price, description, variants } = req.body;
        if (!variants || variants.length === 0) {
            return res.status(400).json({ message: "Variants are required" });
        }
        if (price === undefined || price === null || price === "" || isNaN(price)) {
            return res.status(400).json({ message: "Price must be valid and required" });
        }
        const invalidStock = variants.some((v) => v.stock === undefined || v.stock === null || isNaN(v.stock) || v.stock < 0);
        if (invalidStock) {
            return res.status(400).json({ message: "Stock must be valid and required" });
        }
        if (variants.stock < 0) {
            return res.status(400).json({ message: "Stock cannot be negative" });
        }
        const existedproduct = await Product.findOne({ name, category });
        if (existedproduct) {
            return res.status(400).json({
                message: "Product Already in the Database!"
            });
        }
        const generateBarcode = (category, variant) => {
            const cat = category.slice(0, 3).toUpperCase();
            const size = variant.size || "NA";
            const color = variant.color?.slice(0, 3).toUpperCase() || "NA";
            const unique = Math.floor(10000000 + Math.random() * 90000000);
            return `${cat}-${size}-${color}-${unique}`;
        };
        const updatedVariants = await Promise.all(
            variants.map(async (variant) => {
                let barcode;
                if (variant.barcode) {
                    const exists = await Product.exists({
                        "variants.barcode": variant.barcode
                    });
                    if (exists) {
                        return Promise.reject(
                            new Error(
                                `Barcode ${variant.barcode} already exists`
                            )
                        );
                    }
                    barcode = variant.barcode;
                }
                else {
                    do {
                        barcode = generateBarcode(category, variant);
                    } while (
                        await Product.exists({
                            "variants.barcode": barcode
                        })
                    );
                }
                return {
                    ...variant,
                    barcode
                };
            })
        );
        const product = new Product({
            name,
            category,
            price,
            description,
            variants: updatedVariants
        });
        await product.save();
        return res.status(201).json(product);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// status 200
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        return res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// status 200
export const getproductorvariant = async (req, res) => {
    try {
        const { code } = req.params;
        let product = await Product.findOne({ productCode: code });
        if (product) {
            return res.status(200).json({
                type: "Product",
                product: product.name,
                variants: product.variants
            });
        }
        product = await Product.findOne({ "variants.barcode": code });
        if (product) {
            const foundVariant = product.variants.find(
                v => v.barcode === code
            );
            return res.status(200).json({
                type: "Variant",
                productId: product._id,
                productName: product.name,
                price:product.price,
                variant: foundVariant
            });
        }
        return res.status(404).json({
            message: "Product or Variant not found!"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// status 200
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, description, variants } = req.body;

        // Auto-generate barcodes for variants that don't have one
        let updatedVariants = variants;
        if (variants && category) {
            updatedVariants = await Promise.all(
                variants.map(async (variant) => {
                    if (variant.barcode) return variant;
                    const cat = category.slice(0, 3).toUpperCase();
                    const size = variant.size || "NA";
                    const color = variant.color?.slice(0, 3).toUpperCase() || "NA";
                    let barcode;
                    do {
                        const unique = Math.floor(10000000 + Math.random() * 90000000);
                        barcode = `${cat}-${size}-${color}-${unique}`;
                    } while (await Product.exists({ "variants.barcode": barcode }));
                    return { ...variant, barcode };
                })
            );
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { name, category, price, description, variants: updatedVariants },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found in database!" });
        }

        return res.status(200).json(updatedProduct);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// status 200
export const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        return res.json({ message: "Product deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
// status 200
export const scanProduct = async (req, res) => {
    try {
        const { barcode } = req.body;
        const product = await Product.findOne({
            "variants.barcode": barcode
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const variant = product.variants.find(v => v.barcode === barcode);
        if (!variant) {
            return res.status(404).json({ message: "Variant not found" });
        }
        if (variant.stock <= 0) {
            return res.status(400).json({ message: "Out of stock" });
        }
        return res.status(200).json({
            message: "Product scanned",
            product: product.name,
            price:product.price,
            variant
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// status 200
export const bill = async (req, res) => {
    try {
        const { items } = req.body;


        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items provided" });
        }

        let billItems = [];
        let total = 0;


        for (let i = 0; i < items.length; i++) {
            const { barcode, quantity } = items[i];

            // Validate each item
            if (!barcode || !quantity) {
                return res.status(400).json({
                    message: "Each item must have barcode and quantity"
                });
            }


            const product = await Product.findOne({
                "variants.barcode": barcode
            });

            if (!product) {
                return res.status(404).json({
                    message: `Product not found for barcode: ${barcode}`
                });
            }


            const variant = product.variants.find(
                v => v.barcode === barcode
            );

            if (!variant) {
                return res.status(404).json({
                    message: `Variant not found for barcode: ${barcode}`
                });
            }


            if (variant.stock < quantity) {
                return res.status(400).json({
                    message: `Not enough stock for ${product.name}`
                });
            }


            const itemTotal = product.price * quantity;


            variant.stock -= quantity;
            await product.save();


            billItems.push({
                productId: product._id,
                productName: product.name,
                barcode: variant.barcode,
                size: variant.size,
                color: variant.color,
                price: product.price,
                quantity: quantity,
                total: itemTotal
            });

            total += itemTotal;
        }


        const newBill = new Bill({
            items: billItems,
            totalAmount: total
        });

        await newBill.save();
        return res.status(201).json({
            message: "Bill created successfully",
            bill: newBill
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
// status 200
export const lowStockProducts = async (req, res) => {

    try {
        const products = await Product.find();
        const lowStock = [];
        products.forEach(product => {
            product.variants.forEach(
                variant => {
                    if (
                        variant.stock <= 5
                    ) {
                        lowStock.push({
                            product:
                                product.name,
                            barcode:
                                variant.barcode,
                            stock:
                                variant.stock
                        });
                    }
                }
            );
        });
        return res.status(200).json(lowStock);
    }
    catch (error) {
        return res.status(500)
            .json({
                message: error.message
            });
    }
};
// status 200
export const getBills = async (req, res) => {
    try {
        const bills = await Bill.find().sort({ createdAt: -1 }).limit(50);
        return res.status(200).json(bills);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};