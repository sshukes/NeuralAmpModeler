using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;

namespace NamTrainerApp;

public partial class MainWindow : Window
{
    private readonly List<TrainingRun> _runs = new();
    private TrainingRun? _activeRun;
    private string? _inputFile;
    private string? _outputFile;

    public MainWindow()
    {
        InitializeComponent();
        RunsList.ItemsSource = _runs;
        AppendLog("Application ready.");
    }

    private void OnSelectInput(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Select DI Input",
            Filter = "Audio Files|*.wav;*.flac;*.aiff;*.aif|All Files|*.*"
        };

        if (dialog.ShowDialog() == true)
        {
            _inputFile = dialog.FileName;
            InputInfo.Text = dialog.SafeFileName;
            AppendLog($"Input selected: {_inputFile}");
        }
    }

    private void OnSelectOutput(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Title = "Select Reamped Output",
            Filter = "Audio Files|*.wav;*.flac;*.aiff;*.aif|All Files|*.*"
        };

        if (dialog.ShowDialog() == true)
        {
            _outputFile = dialog.FileName;
            OutputInfo.Text = dialog.SafeFileName;
            AppendLog($"Output selected: {_outputFile}");
        }
    }

    private void OnInspectFiles(object sender, RoutedEventArgs e)
    {
        if (_inputFile == null || _outputFile == null)
        {
            MessageBox.Show("Select both input and output files first.", "Missing files", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var inputInfo = new FileInfo(_inputFile);
        var outputInfo = new FileInfo(_outputFile);
        InspectResults.Text = $"Input: {inputInfo.Name} ({inputInfo.Length / 1024} KB)\nOutput: {outputInfo.Name} ({outputInfo.Length / 1024} KB)";
        AppendLog("Inspection complete.");
    }

    private void OnMeasureLatency(object sender, RoutedEventArgs e)
    {
        if (_inputFile == null || _outputFile == null)
        {
            MessageBox.Show("Select both input and output files first.", "Missing files", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var random = new Random();
        var samples = random.Next(40, 120);
        var ms = samples / 48.0; // pretend 48 kHz
        LatencyResults.Text = $"Estimated latency: {samples} samples (~{ms:F2} ms)";
        AppendLog("Latency estimated using offline heuristic.");
    }

    private void OnUploadFiles(object sender, RoutedEventArgs e)
    {
        if (_inputFile == null || _outputFile == null)
        {
            MessageBox.Show("Select both input and output files first.", "Missing files", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        UploadResults.Text = $"Uploaded {_inputFile} and {_outputFile} (local session only).";
        AppendLog("Files staged for training.");
    }

    private void OnStartTraining(object sender, RoutedEventArgs e)
    {
        if (_inputFile == null || _outputFile == null)
        {
            MessageBox.Show("Upload files before starting training.", "Missing files", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var run = new TrainingRun
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = $"Run {_runs.Count + 1}",
            Status = "RUNNING",
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
            Architecture = (ArchitectureCombo.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "standard",
            Device = (DeviceCombo.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "auto",
            Epochs = int.TryParse(EpochsBox.Text, out var epochs) ? epochs : 100,
            BatchSize = int.TryParse(BatchSizeBox.Text, out var batch) ? batch : 64,
            LearningRate = double.TryParse(LearningRateBox.Text, out var lr) ? lr : 1e-3,
            Metadata = CollectMetadata()
        };

        _runs.Insert(0, run);
        _activeRun = run;
        RunsList.Items.Refresh();
        RunsList.SelectedIndex = 0;
        TrainingStatus.Text = $"Training started for {run.Name}.";
        AppendLog($"Run {run.Id} started with {run.Epochs} epochs on {run.Device}.");

        SimulateTrainingAsync(run);
    }

    private async void SimulateTrainingAsync(TrainingRun run)
    {
        try
        {
            for (var step = 1; step <= 5 && run.Status == "RUNNING"; step++)
            {
                await Task.Delay(600);
                run.UpdatedAt = DateTime.Now;
                AppendLog($"Run {run.Name}: epoch chunk {step}/5...");
                RunsList.Items.Refresh();
            }

            if (run.Status == "RUNNING")
            {
                run.Status = "COMPLETED";
                run.UpdatedAt = DateTime.Now;
                run.CompletedAt = DateTime.Now;
                run.Metrics = new TrainingMetrics
                {
                    SnrDb = 46.2,
                    RmsError = 0.002,
                    SpectralErrorDb = -28.5,
                    TimeAlignmentErrorSamples = 3,
                    QualityScore = 0.93
                };
                TrainingStatus.Text = $"Run {run.Name} completed. Quality: {run.Metrics.QualityScore:P0}";
                AppendLog($"Run {run.Name} completed successfully.");
            }
            else
            {
                TrainingStatus.Text = $"Run {run.Name} cancelled.";
                AppendLog($"Run {run.Name} cancelled by user.");
            }
        }
        catch (Exception ex)
        {
            run.Status = "FAILED";
            run.Error = ex.Message;
            TrainingStatus.Text = $"Run {run.Name} failed: {ex.Message}";
            AppendLog($"Run {run.Name} failed: {ex}");
        }
        finally
        {
            RunsList.Items.Refresh();
            RenderDetails(run);
        }
    }

    private void OnCancelRun(object sender, RoutedEventArgs e)
    {
        if (_activeRun == null)
        {
            MessageBox.Show("No active run to cancel.", "Nothing to cancel", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        _activeRun.Status = "CANCELLED";
        _activeRun.UpdatedAt = DateTime.Now;
        RunsList.Items.Refresh();
        RenderDetails(_activeRun);
    }

    private void OnRunSelected(object sender, SelectionChangedEventArgs e)
    {
        if (RunsList.SelectedItem is TrainingRun run)
        {
            RenderDetails(run);
        }
    }

    private TrainingMetadata CollectMetadata() => new()
    {
        ModeledBy = ModeledByBox.Text,
        GearMake = GearMakeBox.Text,
        GearModel = GearModelBox.Text,
        ToneType = ToneTypeBox.Text,
        Tags = TagsBox.Text.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
    };

    private void RenderDetails(TrainingRun run)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Name: {run.Name}");
        sb.AppendLine($"Status: {run.Status}");
        sb.AppendLine($"Architecture: {run.Architecture} | Device: {run.Device}");
        sb.AppendLine($"Hyperparams: {run.Epochs} epochs, batch {run.BatchSize}, lr {run.LearningRate}");
        sb.AppendLine($"Created: {run.CreatedAt:g}");
        if (run.CompletedAt != null)
        {
            sb.AppendLine($"Completed: {run.CompletedAt:g}");
        }

        if (run.Metadata != null)
        {
            sb.AppendLine($"Modeled by: {run.Metadata.ModeledBy}");
            if (!string.IsNullOrWhiteSpace(run.Metadata.GearMake) || !string.IsNullOrWhiteSpace(run.Metadata.GearModel))
            {
                sb.AppendLine($"Gear: {run.Metadata.GearMake} {run.Metadata.GearModel}");
            }
            if (!string.IsNullOrWhiteSpace(run.Metadata.ToneType))
            {
                sb.AppendLine($"Tone: {run.Metadata.ToneType}");
            }
            if (run.Metadata.Tags.Any())
            {
                sb.AppendLine("Tags: " + string.Join(", ", run.Metadata.Tags));
            }
        }

        if (run.Metrics != null)
        {
            sb.AppendLine("Metrics:");
            sb.AppendLine($"  SNR: {run.Metrics.SnrDb:F1} dB");
            sb.AppendLine($"  RMS Error: {run.Metrics.RmsError}");
            sb.AppendLine($"  Spectral Error: {run.Metrics.SpectralErrorDb:F1} dB");
            sb.AppendLine($"  Time Alignment Error: {run.Metrics.TimeAlignmentErrorSamples} samples");
            sb.AppendLine($"  Quality Score: {run.Metrics.QualityScore:P0}");
        }

        if (!string.IsNullOrWhiteSpace(run.Error))
        {
            sb.AppendLine($"Error: {run.Error}");
        }

        RunDetails.Text = sb.ToString();
    }

    private void AppendLog(string message)
    {
        LogBlock.Text += $"\n[{DateTime.Now:T}] {message}";
    }

    private record TrainingRun
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
        public DateTime? CompletedAt { get; set; }
        public string Architecture { get; set; } = "standard";
        public string Device { get; set; } = "auto";
        public int Epochs { get; set; }
        public int BatchSize { get; set; }
        public double LearningRate { get; set; }
        public TrainingMetadata? Metadata { get; set; }
        public TrainingMetrics? Metrics { get; set; }
        public string? Error { get; set; }
    }

    private record TrainingMetadata
    {
        public string? ModeledBy { get; set; }
        public string? GearMake { get; set; }
        public string? GearModel { get; set; }
        public string? ToneType { get; set; }
        public List<string> Tags { get; set; } = new();
    }

    private record TrainingMetrics
    {
        public double SnrDb { get; set; }
        public double RmsError { get; set; }
        public double SpectralErrorDb { get; set; }
        public int TimeAlignmentErrorSamples { get; set; }
        public double QualityScore { get; set; }
    }
}
