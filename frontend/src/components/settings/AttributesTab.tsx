'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Modal from '@/components/ui/Modal';
import { attributeSchema, type AttributeFormData, attributeValueSchema, type AttributeValueFormData } from '@/schemas/attribute';
import { useAttributesList } from '@/hooks/settings/useAttributesList';
import { useCreateAttribute } from '@/hooks/settings/useCreateAttribute';
import { useUpdateAttribute } from '@/hooks/settings/useUpdateAttribute';
import { useDeleteAttribute } from '@/hooks/settings/useDeleteAttribute';
import { useAddAttributeValue } from '@/hooks/settings/useAddAttributeValue';
import { useUpdateAttributeValue } from '@/hooks/settings/useUpdateAttributeValue';
import { useDeleteAttributeValue } from '@/hooks/settings/useDeleteAttributeValue';
import { useReorderAttributes } from '@/hooks/settings/useReorderAttributes';
import { useReorderAttributeValues } from '@/hooks/settings/useReorderAttributeValues';
import type { Attribute, AttributeValue } from '@/types/attribute';

// --- Attribute Form Modal ---

function AttributeModal({
  isOpen,
  onClose,
  attribute,
}: {
  isOpen: boolean;
  onClose: () => void;
  attribute: Attribute | null;
}) {
  const createAttr = useCreateAttribute();
  const updateAttr = useUpdateAttribute();
  const isPending = createAttr.isPending || updateAttr.isPending;

  const form = useForm<AttributeFormData>({
    resolver: zodResolver(attributeSchema),
    defaultValues: { name: '', isActive: true },
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(attribute ? { name: attribute.name, isActive: attribute.isActive } : { name: '', isActive: true });
  }, [isOpen, attribute, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (attribute) {
        await updateAttr.mutateAsync({ id: attribute.id, payload: values });
        toast.success('Attribute updated');
      } else {
        await createAttr.mutateAsync(values);
        toast.success('Attribute created');
      }
      onClose();
    } catch {
      // error toast handled by hook
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={attribute ? 'Edit Attribute' : 'New Attribute'}
      formId="attribute-form"
      onCancel={onClose}
      isLoading={isPending}
      confirmLabel={attribute ? 'Update' : 'Create'}
    >
      <form id="attribute-form" onSubmit={onSubmit} className="space-y-4">
        <FormField<AttributeFormData> name="name" control={form.control} label="Attribute Name" placeholder="e.g. Size, Color, Material" />
      </form>
    </Modal>
  );
}

// --- Inline editable value row ---

function ValueRow({
  value,
  onDelete,
  onUpdate,
  dragHandleProps,
}: {
  value: AttributeValue;
  onDelete: (id: string) => void;
  onUpdate: (id: string, val: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.value);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value.value) { setEditing(false); return; }
    onUpdate(value.id, trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white border border-slate-100 hover:border-slate-200 group">
      <span {...dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-400 shrink-0">
        <GripVertical size={14} />
      </span>
      {editing ? (
        <>
          <input
            autoFocus
            className="flex-1 text-sm border-b border-indigo-400 outline-none bg-transparent py-0.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button type="button" onClick={handleSave} className="text-emerald-500 hover:text-emerald-600">
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-[var(--text-primary)]">{value.value}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => { setDraft(value.value); setEditing(true); }} className="text-slate-400 hover:text-indigo-500" title="Edit" aria-label="Edit">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={() => onDelete(value.id)} className="text-slate-400 hover:text-rose-500" title="Delete" aria-label="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Add value inline form ---

function AddValueForm({ onAdd }: { onAdd: (val: string) => void }) {
  const form = useForm<AttributeValueFormData>({
    resolver: zodResolver(attributeValueSchema),
    defaultValues: { value: '' },
  });

  const onSubmit = form.handleSubmit((data) => {
    onAdd(data.value);
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex gap-2 mt-2">
      <div className="flex-1">
        <FormField<AttributeValueFormData>
          name="value"
          control={form.control}
          placeholder="New value (e.g. M, Red, Cotton)…"
        />
      </div>
      <Button type="submit" size="sm">
        <Plus size={14} />
        Add
      </Button>
    </form>
  );
}

// --- Main Component ---

export default function AttributesTab() {
  const { data: attributes, isLoading, error, refetch } = useAttributesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);

  const deleteAttr = useDeleteAttribute();
  const addValue = useAddAttributeValue();
  const updateValue = useUpdateAttributeValue();
  const deleteValue = useDeleteAttributeValue();
  const reorderAttrs = useReorderAttributes();
  const reorderValues = useReorderAttributeValues();

  const selectedAttr = attributes.find((a) => a.id === selectedId) ?? null;

  const handleAddValue = async (attributeId: string, val: string) => {
    try {
      await addValue.mutateAsync({ attributeId, payload: { value: val } });
    } catch {
      // error toast handled by hook
    }
  };

  const handleUpdateValue = async (valueId: string, val: string) => {
    try {
      await updateValue.mutateAsync({ valueId, payload: { value: val } });
      toast.success('Value updated');
    } catch {
      // error toast handled by hook
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    try {
      await deleteValue.mutateAsync(valueId);
      toast.success('Value removed');
    } catch {
      // error toast handled by hook
    }
  };

  const handleDeleteAttr = async (attr: Attribute) => {
    try {
      await deleteAttr.mutateAsync(attr.id);
      toast.success(`"${attr.name}" deleted`);
      if (selectedId === attr.id) setSelectedId(null);
    } catch {
      // error toast handled by hook
    }
  };

  // Simple drag-to-reorder for attributes (mouse-only, no external dep)
  const handleAttrDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('attrId', id);
  };

  const handleAttrDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('attrId');
    if (!draggedId || draggedId === targetId) return;
    const sorted = [...attributes].sort((a, b) => a.position - b.position);
    const from = sorted.findIndex((a) => a.id === draggedId);
    const to = sorted.findIndex((a) => a.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...sorted];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    void reorderAttrs.mutateAsync(reordered.map((a, i) => ({ id: a.id, position: i })));
  };

  const handleValueDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('valueId', id);
  };

  const handleValueDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!selectedAttr) return;
    const draggedId = e.dataTransfer.getData('valueId');
    if (!draggedId || draggedId === targetId) return;
    const sorted = [...selectedAttr.values].sort((a, b) => a.position - b.position);
    const from = sorted.findIndex((v) => v.id === draggedId);
    const to = sorted.findIndex((v) => v.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...sorted];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    void reorderValues.mutateAsync({ attributeId: selectedAttr.id, items: reordered.map((v, i) => ({ id: v.id, position: i })) });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-slate-400">Loading attributes…</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-rose-600 font-semibold">Failed to load attributes</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  const sortedAttrs = [...attributes].sort((a, b) => a.position - b.position);

  return (
    <div className="flex gap-6 min-h-[480px]">
      {/* Left panel — attribute list */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Attributes</span>
          <Button size="sm" onClick={() => { setEditingAttr(null); setIsModalOpen(true); }}>
            <Plus size={13} />
            New
          </Button>
        </div>

        {sortedAttrs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-center text-slate-400">
            No attributes yet. Create one to get started.
          </div>
        ) : (
          sortedAttrs.map((attr) => (
            <div
              key={attr.id}
              draggable
              onDragStart={(e) => handleAttrDragStart(e, attr.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleAttrDrop(e, attr.id)}
              onClick={() => setSelectedId(attr.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer border transition-colors group ${
                selectedId === attr.id
                  ? 'border-indigo-300 bg-indigo-50/80 text-indigo-700'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 text-[var(--text-primary)]'
              }`}
            >
              <GripVertical size={13} className="text-slate-300 group-hover:text-slate-400 shrink-0" />
              <span className="flex-1 text-sm font-medium">{attr.name}</span>
              <span className="text-xs text-slate-400">{attr.values.length}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => { setEditingAttr(attr); setIsModalOpen(true); }}
                  className="p-1 rounded text-slate-400 hover:text-indigo-500"
                  title="Edit"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAttr(attr)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                  disabled={deleteAttr.isPending}
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right panel — values for selected attribute */}
      <div className="flex-1 flex flex-col gap-2">
        {!selectedAttr ? (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
            Select an attribute to manage its values
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {selectedAttr.name} — Values
              </span>
              <span className="text-xs text-slate-400">{selectedAttr.values.length} values</span>
            </div>

            {selectedAttr.values.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-center text-slate-400">
                No values yet. Add one below.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {[...selectedAttr.values]
                  .sort((a, b) => a.position - b.position)
                  .map((v) => (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={(e) => handleValueDragStart(e, v.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleValueDrop(e, v.id)}
                    >
                      <ValueRow
                        value={v}
                        onDelete={(id) => void handleDeleteValue(id)}
                        onUpdate={(id, val) => void handleUpdateValue(id, val)}
                      />
                    </div>
                  ))}
              </div>
            )}

            <AddValueForm onAdd={(val) => void handleAddValue(selectedAttr.id, val)} />
          </>
        )}
      </div>

      <AttributeModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAttr(null); }}
        attribute={editingAttr}
      />
    </div>
  );
}
