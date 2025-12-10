using NeuralAmpModeler;
using NeuralAmpModeler.IO;
using NeuralAmpModeler.Model;
using NeuralAmpModeler.SignalProcessing;

var options = CliOptions.Parse(args);
var logger = new ConsoleLogger();

try
{
    var modelLoader = new ModelLoader(logger);
    var model = modelLoader.Load(options.ModelPath);

    var inputSignal = options.InputPath is not null
        ? SignalReader.Read(options.InputPath)
        : SignalGenerator.GenerateTestSignal(samples: 1024, frequency: 440.0, sampleRate: 48000);

    var processed = model.Process(inputSignal);
    var analyzer = new SignalAnalyzer();
    var stats = analyzer.Analyze(processed);

    logger.Info($"Processed {processed.Count} samples using {model.Description}.");
    logger.Info($"Output stats -> Min: {stats.Minimum:F4}, Max: {stats.Maximum:F4}, RMS: {stats.Rms:F4}");

    if (options.OutputPath is not null)
    {
        SignalWriter.Write(options.OutputPath, processed);
        logger.Info($"Wrote output signal to {options.OutputPath}.");
    }

    if (options.PrintSamples)
    {
        logger.Info("First 8 processed samples: " + string.Join(", ", processed.Take(8).Select(v => v.ToString("F4"))));
    }
}
catch (Exception ex)
{
    logger.Error($"Failed to run Neural Amp Modeler: {ex.Message}");
    logger.Debug(ex.ToString());
    Environment.ExitCode = 1;
}
