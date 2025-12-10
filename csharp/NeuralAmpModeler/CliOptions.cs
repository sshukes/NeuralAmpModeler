namespace NeuralAmpModeler;

public sealed class CliOptions
{
    public string ModelPath { get; init; }
    public string? InputPath { get; init; }
    public string? OutputPath { get; init; }
    public bool PrintSamples { get; init; }

    private CliOptions(string modelPath, string? inputPath, string? outputPath, bool printSamples)
    {
        ModelPath = modelPath;
        InputPath = inputPath;
        OutputPath = outputPath;
        PrintSamples = printSamples;
    }

    public static CliOptions Parse(string[] args)
    {
        string? modelPath = null;
        string? inputPath = null;
        string? outputPath = null;
        bool printSamples = false;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--model":
                case "-m":
                    modelPath = RequireNext(args, ref i, "model");
                    break;
                case "--input":
                case "-i":
                    inputPath = RequireNext(args, ref i, "input");
                    break;
                case "--output":
                case "-o":
                    outputPath = RequireNext(args, ref i, "output");
                    break;
                case "--print":
                case "-p":
                    printSamples = true;
                    break;
                case "--help":
                case "-h":
                    PrintHelp();
                    Environment.Exit(0);
                    break;
                default:
                    throw new ArgumentException($"Unknown argument '{args[i]}'.");
            }
        }

        modelPath ??= "sample_model.json";

        return new CliOptions(modelPath, inputPath, outputPath, printSamples);
    }

    private static string RequireNext(string[] args, ref int index, string name)
    {
        if (index + 1 >= args.Length)
        {
            throw new ArgumentException($"Expected a value after --{name}.");
        }

        return args[++index];
    }

    private static void PrintHelp()
    {
        Console.WriteLine("Neural Amp Modeler (C#)\n");
        Console.WriteLine("Usage:");
        Console.WriteLine("  dotnet run --project csharp/NeuralAmpModeler -- [options]\n");
        Console.WriteLine("Options:");
        Console.WriteLine("  -m, --model <path>   Path to the JSON model description (defaults to sample_model.json)");
        Console.WriteLine("  -i, --input <path>   Optional CSV input signal (one amplitude per line)");
        Console.WriteLine("  -o, --output <path>  Optional CSV file where the processed signal will be written");
        Console.WriteLine("  -p, --print          Print the first few processed samples to the console");
        Console.WriteLine("  -h, --help           Show this help message\n");
    }
}
