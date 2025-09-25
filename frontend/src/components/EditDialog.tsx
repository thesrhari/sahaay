import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit3, Save, X, Loader2 } from "lucide-react";
import { Feedback } from "@/types/types";

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: Feedback | null;
  onSave: (id: string, updates: Partial<Feedback>) => Promise<void>;
}

const EditDialog: React.FC<EditDialogProps> = ({
  isOpen,
  onClose,
  feedback,
  onSave,
}) => {
  const [summary, setSummary] = useState("");
  const [sentiment, setSentiment] = useState<
    "positive" | "negative" | "neutral" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (feedback) {
      setSummary(feedback.summary || "");
      setSentiment(feedback.sentiment || "");
    }
  }, [feedback]);

  const handleSave = async () => {
    if (!feedback) return;

    setIsLoading(true);
    try {
      await onSave(feedback.id, {
        summary,
        sentiment: sentiment as Feedback["sentiment"],
      });
      onClose();
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Correct Analysis
          </DialogTitle>
          <DialogDescription>
            Update the AI-generated analysis for comment {feedback?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter corrected summary..."
              className="mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="sentiment">Sentiment</Label>
            <Select
              value={sentiment}
              onValueChange={(value) =>
                setSentiment(value as Feedback["sentiment"])
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
