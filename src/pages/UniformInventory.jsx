import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shirt, Plus, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function UniformInventory() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    size: "",
    quantity: 0,
    status: "in_stock"
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["uniform-inventory"],
    queryFn: () => base44.entities.Document.filter({ category: "uniform" }, "-created_date")
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        category: "uniform",
        title: data.item_name,
        sub_category: data.size,
        description: `Quantity: ${data.quantity}`,
        status: data.status,
        metadata: { quantity: data.quantity }
      };
      if (selectedItem) {
        return base44.entities.Document.update(selectedItem.id, payload);
      }
      return base44.entities.Document.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["uniform-inventory"]);
      setShowDialog(false);
      setSelectedItem(null);
      setFormData({ item_name: "", size: "", quantity: 0, status: "in_stock" });
      toast.success("Inventory updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["uniform-inventory"]);
      toast.success("Item deleted");
    }
  });

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.title,
      size: item.sub_category || "",
      quantity: item.metadata?.quantity || 0,
      status: item.status || "in_stock"
    });
    setShowDialog(true);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Uniform Inventory"
        subtitle={`${inventory.length} items in stock`}
        showBack
        action={() => {
          setSelectedItem(null);
          setFormData({ item_name: "", size: "", quantity: 0, status: "in_stock" });
          setShowDialog(true);
        }}
        actionLabel="Add Item"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {inventory.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventory.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Shirt className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-slate-500">Size: {item.sub_category || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{item.metadata?.quantity || 0}</p>
                      <p className="text-xs text-slate-500">in stock</p>
                    </div>
                    <Badge variant={item.status === "in_stock" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No inventory items"
            description="Add your first uniform item"
            action={() => setShowDialog(true)}
            actionLabel="Add Item"
          />
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g., Security Uniform Shirt"
              />
            </div>
            <div>
              <Label>Size</Label>
              <Select value={formData.size} onValueChange={(v) => setFormData({ ...formData, size: v })}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">Small</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Large</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                  <SelectItem value="2XL">2XL</SelectItem>
                  <SelectItem value="3XL">3XL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.item_name}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}