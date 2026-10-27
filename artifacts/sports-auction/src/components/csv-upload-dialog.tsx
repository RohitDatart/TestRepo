import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkUploadPlayers, getGetPlayersByAuctionQueryKey } from '@workspace/api-client-react';
import { getAuthHeaders, formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  X,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auctionId: string;
}

const SAMPLE_PLAYERS = [
  {
    name: "Virat Kohli",
    role: "Batsman",
    basePrice: "2000000",
    city: "Pune",
    photoUrl: "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQrStUvWxYz",
  },
  {
    name: "Rohit Sharma",
    role: "Batsman",
    basePrice: "2000000",
    city: "Mumbai",
    photoUrl: "https://drive.google.com/uc?id=1BcDeFgHiJkLmNoPqRsTuVwXyZ",
  },
  {
    name: "Jasprit Bumrah",
    role: "Bowler",
    basePrice: "1800000",
    city: "Ahmedabad",
    photoUrl: "https://drive.google.com/uc?id=1CdEfGhIjKlMnOpQrStUvWxYzA",
  },
  {
    name: "Hardik Pandya",
    role: "All-Rounder",
    basePrice: "1500000",
    city: "Baroda",
    photoUrl: "https://drive.google.com/uc?id=1DeFgHiJkLmNoPqRsTuVwXyZAb",
  },
  {
    name: "Rishabh Pant",
    role: "Wicketkeeper",
    basePrice: "1600000",
    city: "Delhi",
    photoUrl: "https://drive.google.com/uc?id=1EfGhIjKlMnOpQrStUvWxYzA_B",
  },
];

const SAMPLE_CSV_RAW = [
  "name,role,basePrice,city,photoUrl",
  ...SAMPLE_PLAYERS.map(
    (p) => `${p.name},${p.role},${p.basePrice},${p.city},${p.photoUrl}`
  ),
].join("\n");

interface ParsedPlayerRow {
  name: string;
  role: string;
  basePrice: string;
  city: string;
  photoUrl: string;
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  auctionId,
}: CsvUploadDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPlayerRow[]>([]);
  const [totalDetected, setTotalDetected] = useState<number>(0);
  const [hasNameColumn, setHasNameColumn] = useState<boolean>(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const { mutate: uploadMut, isPending: uploading } = useBulkUploadPlayers({
    request: { headers: getAuthHeaders() },
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({
          queryKey: getGetPlayersByAuctionQueryKey(auctionId),
        });
        toast({
          title: "Players Uploaded",
          description: `Successfully added ${data.count} players to the auction.`,
        });
        handleClose();
      },
      onError: (err: any) => {
        toast({
          title: "CSV upload failed",
          description:
            err.data?.message ||
            err.message ||
            "Please check your CSV format and try again",
          variant: "destructive",
        });
      },
    },
  });

  const handleClose = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setTotalDetected(0);
    setHasNameColumn(true);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_RAW], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_players.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Sample CSV Downloaded",
      description: "sample_players.csv is ready. Fill in your players and upload.",
    });
  };

  const copySampleCsv = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_RAW);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Sample CSV template copied. Paste it into your spreadsheet or text editor.",
    });
  };

  const parseClientCsv = (text: string) => {
    try {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setParseError("The CSV file must contain a header row and at least one player row.");
        setParsedRows([]);
        setTotalDetected(0);
        setHasNameColumn(false);
        return;
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += c;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_]/g, ""));
      const nameIndex = headers.findIndex((h) => h === "name");
      const roleIndex = headers.findIndex((h) => h === "role");
      const basePriceIndex = headers.findIndex(
        (h) => h === "baseprice" || h === "price"
      );
      const cityIndex = headers.findIndex((h) => h === "city");
      const photoUrlIndex = headers.findIndex(
        (h) => h === "photourl" || h === "photo" || h === "image"
      );

      if (nameIndex === -1) {
        setHasNameColumn(false);
        setParseError(
          "Header row is missing the required 'name' column. Header found: " +
            lines[0]
        );
        setParsedRows([]);
        setTotalDetected(0);
        return;
      }

      setHasNameColumn(true);
      setParseError(null);

      const rows: ParsedPlayerRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const nameVal = cols[nameIndex] || "";
        if (!nameVal.trim()) continue;

        rows.push({
          name: nameVal,
          role: roleIndex !== -1 && cols[roleIndex] ? cols[roleIndex] : "Player",
          basePrice: basePriceIndex !== -1 && cols[basePriceIndex] ? cols[basePriceIndex] : "200",
          city: cityIndex !== -1 && cols[cityIndex] ? cols[cityIndex] : "-",
          photoUrl: photoUrlIndex !== -1 && cols[photoUrlIndex] ? cols[photoUrlIndex] : "",
        });
      }

      setTotalDetected(rows.length);
      setParsedRows(rows.slice(0, 5));
    } catch (e: any) {
      setParseError("Failed to parse CSV file: " + (e?.message || "Unknown error"));
      setParsedRows([]);
      setTotalDetected(0);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please select a file with .csv extension.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      parseClientCsv(content);
    };
    reader.onerror = () => {
      setParseError("Could not read selected file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a valid CSV file to upload.",
        variant: "destructive",
      });
      return;
    }
    if (!hasNameColumn || totalDetected === 0) {
      toast({
        title: "Invalid CSV content",
        description: "Please ensure your CSV has a 'name' column and at least one player row.",
        variant: "destructive",
      });
      return;
    }

    uploadMut({ data: { file: selectedFile, auctionId } as any });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else onOpenChange(val); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">Bulk Upload Players via CSV</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Review the acceptable CSV structure below, download a template, or upload your file.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Format Requirements section */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-white">Acceptable CSV Columns</h4>
              </div>
              <span className="text-[11px] text-muted-foreground">Headers are case-insensitive</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-background/60 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono font-bold text-primary">name</code>
                  <Badge variant="default" className="text-[9px] h-4 px-1.5 uppercase">Required</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">Full player name (e.g. Virat Kohli)</p>
              </div>

              <div className="p-2.5 rounded-lg bg-background/60 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono font-bold text-white">role</code>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase">Optional</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">Batsman, Bowler, All-Rounder, Wicketkeeper (default: Player)</p>
              </div>

              <div className="p-2.5 rounded-lg bg-background/60 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono font-bold text-white">basePrice</code>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase">Optional</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">Starting bid in numbers (e.g. 2000000; default: 200)</p>
              </div>

              <div className="p-2.5 rounded-lg bg-background/60 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono font-bold text-white">city</code>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase">Optional</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">Player's city or origin (e.g. Mumbai, Pune)</p>
              </div>

              <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono font-bold text-white">photoUrl</code>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase">Optional</Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Direct image URL or public Google Drive link (<span className="text-white/80 font-mono">drive.google.com/uc?id=...</span>)
                </p>
              </div>
            </div>
          </div>

          {/* Sample Format Preview with Download and Copy */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Sample CSV Format
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={downloadSampleCsv}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={copySampleCsv}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Template
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="table" className="w-full">
              <TabsList className="grid w-48 grid-cols-2 h-8 mb-2">
                <TabsTrigger value="table" className="text-xs">Preview</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">Raw CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-0">
                <div className="rounded-lg border border-border overflow-hidden bg-black/40">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="py-2 text-xs font-bold text-white">name *</TableHead>
                        <TableHead className="py-2 text-xs font-bold text-white">role</TableHead>
                        <TableHead className="py-2 text-xs font-bold text-white">basePrice</TableHead>
                        <TableHead className="py-2 text-xs font-bold text-white">city</TableHead>
                        <TableHead className="py-2 text-xs font-bold text-white">photoUrl</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SAMPLE_PLAYERS.map((p, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-semibold text-white py-2">{p.name}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {p.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 font-mono text-muted-foreground">
                            {formatCurrency(Number(p.basePrice))}
                          </TableCell>
                          <TableCell className="py-2 text-muted-foreground">{p.city}</TableCell>
                          <TableCell className="py-2 text-muted-foreground truncate max-w-[150px] font-mono text-[11px]">
                            {p.photoUrl}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-0">
                <div className="rounded-lg border border-border bg-black/60 p-3 font-mono text-xs overflow-x-auto text-primary/90 leading-relaxed">
                  <pre className="whitespace-pre">{SAMPLE_CSV_RAW}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Upload Area */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload Your CSV File
            </h4>

            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-secondary/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Click to select CSV or drag & drop here
                </p>
                <p className="text-xs text-muted-foreground">
                  File format must be <span className="text-white font-mono">.csv</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull;{" "}
                        {totalDetected > 0 ? (
                          <span className="text-green-400 font-semibold">{totalDetected} players detected</span>
                        ) : (
                          <span className="text-amber-400">Scanning rows...</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-white"
                      onClick={() => {
                        setSelectedFile(null);
                        setParsedRows([]);
                        setTotalDetected(0);
                        setParseError(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {parseError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2.5 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Format Issue Detected</p>
                      <p className="text-[11px] mt-0.5 opacity-90">{parseError}</p>
                    </div>
                  </div>
                )}

                {!parseError && hasNameColumn && parsedRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        Valid preview (showing first {parsedRows.length} of {totalDetected} players):
                      </span>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden bg-black/40">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="py-1.5 text-[11px] font-bold text-white">Name</TableHead>
                            <TableHead className="py-1.5 text-[11px] font-bold text-white">Role</TableHead>
                            <TableHead className="py-1.5 text-[11px] font-bold text-white">Base Price</TableHead>
                            <TableHead className="py-1.5 text-[11px] font-bold text-white">City</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.map((r, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-semibold text-white py-1.5">{r.name}</TableCell>
                              <TableCell className="py-1.5">{r.role}</TableCell>
                              <TableCell className="py-1.5 font-mono">{formatCurrency(Number(r.basePrice) || 200)}</TableCell>
                              <TableCell className="py-1.5 text-muted-foreground">{r.city || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/40 gap-2 sm:gap-0 mt-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || !hasNameColumn || totalDetected === 0 || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {totalDetected > 0 ? `${totalDetected} Players` : "Players"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
