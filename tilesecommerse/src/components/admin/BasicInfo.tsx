"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { forwardRef, useImperativeHandle, useState, useEffect, Fragment } from "react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/category/queries/useCategories";
import type { ProductCategory } from "@/schemas";

export type BasicInfoRef = {
  name: string;
  description: string;
  price: string;
  category: ProductCategory | "";
  reset: () => void;
};

export interface BasicInfoInitialData {
  name?: string;
  description?: string;
  price?: number;
  category?: ProductCategory;
}

interface BasicInfoProps {
  errors?: Record<string, string[]>;
  initialData?: BasicInfoInitialData;
}

export const BasicInfo = forwardRef<BasicInfoRef, BasicInfoProps>(
  ({ errors, initialData }, ref) => {
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [price, setPrice] = useState(initialData?.price?.toString() || "");

    // Three-level category selection
    const [selectedParentId, setSelectedParentId] = useState<string>("");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
    const [selectedSubSubcategoryId, setSelectedSubSubcategoryId] = useState<string>("");

    // Final category value (the deepest selected level)
    const [category, setCategory] = useState<ProductCategory | "">(initialData?.category || "");

    const { categories, isLoading: categoriesLoading } = useCategories();

    // Get subcategories based on selected parent
    const subcategories = categories.find((c: any) => c._id === selectedParentId)?.children || [];

    // Get sub-subcategories based on selected subcategory
    const subSubcategories = subcategories.find((c: any) => c._id === selectedSubcategoryId)?.children || [];

    // Initialize selections if editing existing product
    useEffect(() => {
      if (initialData?.category && categories.length > 0 && !selectedParentId) {
        // Find which level the category belongs to
        for (const parent of categories) {
          if (parent._id === initialData.category) {
            setSelectedParentId(parent._id);
            setCategory(parent._id);
            return;
          }
          if (parent.children) {
            for (const child of parent.children) {
              if (child._id === initialData.category) {
                setSelectedParentId(parent._id);
                setSelectedSubcategoryId(child._id);
                setCategory(child._id);
                return;
              }
              if (child.children) {
                for (const subChild of child.children) {
                  if (subChild._id === initialData.category) {
                    setSelectedParentId(parent._id);
                    setSelectedSubcategoryId(child._id);
                    setSelectedSubSubcategoryId(subChild._id);
                    setCategory(subChild._id);
                    return;
                  }
                }
              }
            }
          }
        }
      }
    }, [initialData?.category, categories, selectedParentId]);

    // Handle parent category change
    const handleParentChange = (value: string) => {
      setSelectedParentId(value);
      setSelectedSubcategoryId("");
      setSelectedSubSubcategoryId("");
      setCategory(value);
    };

    // Handle subcategory change
    const handleSubcategoryChange = (value: string) => {
      setSelectedSubcategoryId(value);
      setSelectedSubSubcategoryId("");
      setCategory(value);
    };

    // Handle sub-subcategory change
    const handleSubSubcategoryChange = (value: string) => {
      setSelectedSubSubcategoryId(value);
      setCategory(value);
    };

    useImperativeHandle(ref, () => ({
      name,
      description,
      price,
      category,
      reset: () => {
        setName("");
        setDescription("");
        setPrice("");
        setCategory("");
        setSelectedParentId("");
        setSelectedSubcategoryId("");
        setSelectedSubSubcategoryId("");
      },
    }));

    return (
      <div className="space-y-5">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-color-secondary">
            Product Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product name"
            className={cn(
              "h-11",
              errors?.name && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors?.name && (
            <p className="text-sm text-red-400 font-medium">{errors.name[0]}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-color-secondary">
            Description <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product in detail..."
            className={cn(
              "min-h-[120px] resize-none",
              errors?.description && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors?.description && (
            <p className="text-sm text-red-400 font-medium">{errors.description[0]}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price" className="text-sm font-medium text-color-secondary">
            Price (€) <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-color-tertiary">
              €
            </span>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={cn(
                "h-11 pl-8",
                errors?.price && "border-red-500 focus-visible:ring-red-500"
              )}
            />
          </div>
          {errors?.price && (
            <p className="text-sm text-red-400 font-medium">{errors.price[0]}</p>
          )}
        </div>

        {/* Three-Level Category Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Level 0: Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parent-category" className="text-sm font-medium text-color-secondary">
              Category <span className="text-red-400">*</span>
            </Label>
            <Select value={selectedParentId} onValueChange={handleParentChange}>
              <SelectTrigger
                id="parent-category"
                className={cn(
                  "h-11",
                  errors?.category && "border-red-500 focus-visible:ring-red-500"
                )}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <SelectItem value="" disabled>
                    Loading...
                  </SelectItem>
                ) : Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((parent: any) => (
                    <SelectItem key={parent._id} value={parent._id}>
                      {parent.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No categories
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors?.category && !selectedSubcategoryId && !selectedSubSubcategoryId && (
              <p className="text-sm text-red-400 font-medium">{errors.category[0]}</p>
            )}
          </div>

          {/* Level 1: Subcategory (Brand) */}
          <div className="space-y-2">
            <Label htmlFor="subcategory" className="text-sm font-medium text-color-secondary">
              Brand / Subcategory
            </Label>
            <Select
              value={selectedSubcategoryId}
              onValueChange={handleSubcategoryChange}
              disabled={!selectedParentId || subcategories.length === 0}
            >
              <SelectTrigger
                id="subcategory"
                className="h-11"
              >
                <SelectValue placeholder={!selectedParentId ? "Select category first" : "Select brand"} />
              </SelectTrigger>
              <SelectContent>
                {subcategories.length > 0 ? (
                  subcategories.map((sub: any) => (
                    <SelectItem key={sub._id} value={sub._id}>
                      {sub.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No subcategories
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Level 2: Sub-subcategory */}
          <div className="space-y-2">
            <Label htmlFor="sub-subcategory" className="text-sm font-medium text-color-secondary">
              Sub-category
            </Label>
            <Select
              value={selectedSubSubcategoryId}
              onValueChange={handleSubSubcategoryChange}
              disabled={!selectedSubcategoryId || subSubcategories.length === 0}
            >
              <SelectTrigger
                id="sub-subcategory"
                className="h-11"
              >
                <SelectValue placeholder={!selectedSubcategoryId ? "Select brand first" : "Select sub-category"} />
              </SelectTrigger>
              <SelectContent>
                {subSubcategories.length > 0 ? (
                  subSubcategories.map((subSub: any) => (
                    <SelectItem key={subSub._id} value={subSub._id}>
                      {subSub.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No sub-categories
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }
);

BasicInfo.displayName = "BasicInfo";
