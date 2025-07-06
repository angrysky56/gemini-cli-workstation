import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPServers, AddMcpServerForm } from './App'; // Assuming AddMcpServerForm can be co-located or eventually extracted
                                                 // For now, I'll need to adjust App.jsx to export them if not already.
                                                 // If they are not exported, I will have to test via MCPServers parent.

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    Icon: ({ name }) => <div data-testid={`icon-${name}`}>{name}</div>,
    PlusCircle: (props) => <div data-testid="icon-PlusCircle" {...props} />,
    FileEdit: (props) => <div data-testid="icon-FileEdit" {...props} />,
    Upload: (props) => <div data-testid="icon-Upload" {...props} />,
    Trash2: (props) => <div data-testid="icon-Trash2" {...props} />,
    Check: (props) => <div data-testid="icon-Check" {...props} />,
    X: (props) => <div data-testid="icon-X" {...props} />,
    // Add any other icons used directly by MCPServers or AddMcpServerForm
  };
});

// Mock the fileUtils module
vi.mock('./utils/fileUtils', () => ({
  readJsonFile: vi.fn(),
}));

import { parseArgsStringToArgv } from 'string-argv';

// Mock parseArgsStringToArgv from string-argv
vi.mock('string-argv', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    parseArgsStringToArgv: vi.fn((argsString) => {
      if (argsString === null || argsString === undefined || argsString.trim() === '') return [];
      // A simplified mock for robust testing of the component's usage of it.
      // Real string-argv parsing is complex and assumed to be tested by the library itself.
      // This mock handles basic space separation and quote removal for test predictability.
      const parts = [];
      let currentPart = '';
      let inQuotes = false;
      for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i];
        if (char === '"') {
          inQuotes = !inQuotes;
          if (!inQuotes && currentPart === '' && argsString[i-1] === '"') { // Handles "" as empty arg if needed
            // no-op, currentPart is already empty
          }
          continue; // Don't add quotes to parts
        }
        if (char === ' ' && !inQuotes) {
          if (currentPart !== '') {
            parts.push(currentPart);
            currentPart = '';
          }
          continue;
        }
        currentPart += char;
      }
      if (currentPart !== '') {
        parts.push(currentPart);
      }
      return parts;
    }),
  };
});


// To test AddMcpServerForm, we might need to render MCPServers and trigger the 'Add Server' state
// Or, preferably, extract AddMcpServerForm for direct testing.
// For now, let's assume we can extract/import AddMcpServerForm or test its core logic
// through MCPServers.

// Props factory for MCPServers
const createMCPServersProps = (overrideProps = {}, initialSettings = {}) => {
  const defaultSettings = {
    mcpServers: {},
    baseFolderPath: '/base/path', // Default for most tests unless overridden by initialSettings
    ...initialSettings,
  };
  return {
    settings: defaultSettings,
    setSettings: vi.fn(),
    api: { /* mock any api functions if needed */ },
    ...overrideProps,
  };
};

// Props factory for AddMcpServerForm
// This function was not fully corrected in the previous step and had leftover lines.
// Correcting it now, though it's not actively used by the current tests for AddMcpServerForm
// which are running via MCPServers.
const createAddMcpServerFormProps = (overrideProps = {}) => ({
  newServer: {
    name: '',
    command: '',
    args: '', // string input
    cwd: '',
    timeout: 600000,
    trust: false,
    env: '', // JSON string input
  },
  setNewServer: vi.fn(),
  addServer: vi.fn(),
  setEditingServer: vi.fn(),
  settings: { baseFolderPath: '/base/path' },
  ...overrideProps,
});

describe('AddMcpServerForm (via MCPServers or direct if extracted)', () => {
  let mockSetSettings;
  let mockShowToast;
  // No currentRenderProps needed here

  beforeEach(() => {
    mockSetSettings = vi.fn();
    mockShowToast = vi.fn();
    // Reset mocks
    vi.mocked(parseArgsStringToArgv).mockClear();
    vi.mocked(parseArgsStringToArgv).mockImplementation((argsString) => {
        if (argsString === null || argsString === undefined || argsString.trim() === '') return [];
        const parts = [];
        let currentPart = '';
        let inQuotes = false;
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            if (char === '"') {
            inQuotes = !inQuotes;
            continue;
            }
            if (char === ' ' && !inQuotes) {
            if (currentPart !== '') {
                parts.push(currentPart);
                currentPart = '';
            }
            continue;
            }
            currentPart += char;
        }
        if (currentPart !== '') {
            parts.push(currentPart);
        }
        return parts;
    });
  });

  // renderFormAndGetElements now accepts the full props to be used for rendering MCPServers
  const renderFormAndGetElements = (mcpServersProps) => {
    render(<MCPServers {...mcpServersProps} />);

    const openFormButton = screen.getAllByRole('button', { name: /add server/i }).find(
      (btn) => btn.className.includes('bg-blue-600') && btn.textContent.includes('Add Server')
    );
    if (!openFormButton) throw new Error("Could not find the 'Add Server' button to open the form.");
    fireEvent.click(openFormButton);

    // Use the settings that were actually passed to MCPServers for determining the placeholder
    const actualSettings = mcpServersProps.settings;
    const expectedCwdPlaceholder = actualSettings.baseFolderPath || "./mcp_servers/python";

    // Debugging line:
    // console.log(`Expecting CWD placeholder: "${expectedCwdPlaceholder}" based on baseFolderPath: "${actualSettings.baseFolderPath}"`);

    return {
      nameInput: screen.getByPlaceholderText('myServer'),
      commandInput: screen.getByPlaceholderText('uv'),
      argsInput: screen.getByPlaceholderText('--directory "/path/with spaces" run server.py'),
      cwdInput: screen.getByPlaceholderText(expectedCwdPlaceholder), // Use dynamically determined placeholder
      timeoutInput: screen.getByDisplayValue('600000'),
      envInput: screen.getByPlaceholderText('{"API_KEY": "$MY_TOKEN"}'),
      trustCheckbox: screen.getByLabelText('Trust this server (bypass confirmations)'),
      submitButton: screen.getAllByRole('button', { name: /add server/i }).find(
        (btn) => btn.className.includes('bg-green-600')
      ),
    };
  };

  it('initializes with correct default values when baseFolderPath is provided', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast }, // Provider specific mocks
      { mcpServers: {}, baseFolderPath: '/test/base/provided' }  // Initial settings for this test
    );
    const { nameInput, commandInput, argsInput, cwdInput, timeoutInput, envInput, trustCheckbox } = renderFormAndGetElements(props);

    expect(nameInput.value).toBe('');
    expect(commandInput.value).toBe('');
    expect(argsInput.value).toBe('');
    expect(cwdInput.placeholder).toBe('/test/base/provided');
    expect(cwdInput.value).toBe('');
    expect(timeoutInput.value).toBe('600000');
    expect(envInput.value).toBe('');
    expect(trustCheckbox.checked).toBe(false);
  });

  it('initializes with correct default CWD placeholder when baseFolderPath is empty string', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '' }
    );
    const { cwdInput } = renderFormAndGetElements(props);
    expect(cwdInput.placeholder).toBe('./mcp_servers/python');
  });

  it('initializes with correct default CWD placeholder when baseFolderPath is undefined', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {} } // baseFolderPath will be undefined in settings after delete
    );
    delete props.settings.baseFolderPath; // Ensure it's undefined

    const { cwdInput } = renderFormAndGetElements(props);
    expect(cwdInput.placeholder).toBe('./mcp_servers/python');
  });

  it('updates newServer state on input change', () => {
    const initialBaseFolderPath = '/test/base/update';
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: initialBaseFolderPath }
    );
    const { nameInput, commandInput, argsInput, cwdInput, timeoutInput, envInput, trustCheckbox, submitButton } = renderFormAndGetElements(props);

    fireEvent.change(nameInput, { target: { value: 'test-server' } });
    fireEvent.change(commandInput, { target: { value: 'test-cmd' } });
    fireEvent.change(argsInput, { target: { value: 'arg1 "arg two"' } });
    fireEvent.change(cwdInput, { target: { value: '/custom/path' } });
    fireEvent.change(timeoutInput, { target: { value: '120000' } });
    fireEvent.change(envInput, { target: { value: '{"KEY":"VAL"}' } });
    fireEvent.click(trustCheckbox);
    fireEvent.click(submitButton);

    expect(mockSetSettings).toHaveBeenCalledTimes(1);
    const newSettingsArg = mockSetSettings.mock.calls[0][0];
    // Use the same baseFolderPath for prevSettings as was used for rendering
    const prevSettings = { mcpServers: {}, baseFolderPath: initialBaseFolderPath };
    const updatedSettings = newSettingsArg(prevSettings);

    const serverConfig = updatedSettings.mcpServers['test-server'];
    expect(serverConfig).toBeDefined();
    expect(serverConfig.command).toBe('test-cmd');
    // Args will be processed by the mocked parseArgsStringToArgv
    expect(serverConfig.args).toEqual(['arg1', 'arg two']);
    expect(serverConfig.cwd).toBe('/custom/path');
    expect(serverConfig.timeout).toBe(120000);
    expect(serverConfig.env).toEqual({ KEY: 'VAL' });
    expect(serverConfig.trust).toBe(true);
  });

  // Split 'parses arguments correctly using string-argv' into multiple tests
  it('parses simple space-separated arguments', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/args-simple' }
    );
    const { nameInput, commandInput, argsInput, submitButton } = renderFormAndGetElements(props);
    const mockParse = vi.mocked(parseArgsStringToArgv);

    fireEvent.change(nameInput, { target: { value: 'arg-test-simple' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(argsInput, { target: { value: 'simple args here' } });
    fireEvent.click(submitButton);

    expect(mockParse).toHaveBeenLastCalledWith('simple args here');
    const serverConfig = mockSetSettings.mock.calls.slice(-1)[0][0](props.settings).mcpServers['arg-test-simple'];
    expect(serverConfig.args).toEqual(['simple', 'args', 'here']);
  });

  it('parses arguments with quotes', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/args-quotes' }
    );
    const { nameInput, commandInput, argsInput, submitButton } = renderFormAndGetElements(props);
    const mockParse = vi.mocked(parseArgsStringToArgv);

    fireEvent.change(nameInput, { target: { value: 'arg-test-quotes' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(argsInput, { target: { value: '"quoted argument" other-arg' } });
    fireEvent.click(submitButton);

    expect(mockParse).toHaveBeenLastCalledWith('"quoted argument" other-arg');
    const serverConfig = mockSetSettings.mock.calls.slice(-1)[0][0](props.settings).mcpServers['arg-test-quotes'];
    expect(serverConfig.args).toEqual(['quoted argument', 'other-arg']);
  });

  it('parses empty arguments string to an empty array', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/args-empty' }
    );
    const { nameInput, commandInput, argsInput, submitButton } = renderFormAndGetElements(props);
    const mockParse = vi.mocked(parseArgsStringToArgv);

    fireEvent.change(nameInput, { target: { value: 'arg-test-empty' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(argsInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    // If newServer.args is empty, parseArgsStringToArgv is NOT called due to the ternary operator.
    // So we check that the args array is empty directly.
    // We could also check that mockParse was NOT called with '', but that might be tricky
    // if other interactions call it. The most important is the final serverConfig.
    const serverConfig = mockSetSettings.mock.calls.slice(-1)[0][0](props.settings).mcpServers['arg-test-empty'];
    expect(serverConfig.args).toEqual([]);
    // Optionally, verify mockParse wasn't called *for this specific interaction path* if needed,
    // but it might be simpler to just verify the outcome.
    // For example, if we are certain no other calls to mockParse happened:
    // expect(mockParse).not.toHaveBeenCalled(); // Or check call count if other calls are expected.
  });

  it('parses environment variables string as JSON', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/envjson' }
    );
    const { nameInput, commandInput, envInput, submitButton } = renderFormAndGetElements(props);
    fireEvent.change(nameInput, { target: { value: 'env-test' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(envInput, { target: { value: '{"KEY1":"VAL1", "KEY2":123}' } });
    fireEvent.click(submitButton);

    const serverConfig = mockSetSettings.mock.calls.slice(-1)[0][0](createMCPServersProps().settings).mcpServers['env-test'];
    expect(serverConfig.env).toEqual({ KEY1: 'VAL1', KEY2: 123 });
  });

  it('shows toast error for invalid environment variable JSON', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/envfail' }
    );
    const { nameInput, commandInput, envInput, submitButton } = renderFormAndGetElements(props);
    fireEvent.change(nameInput, { target: { value: 'env-fail-test' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(envInput, { target: { value: '{"KEY1":"VAL1", NO_CLOSING_BRACE' } });
    fireEvent.click(submitButton);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Invalid JSON in Environment Variables field. Please check your syntax.',
      'error'
    );
    // Server should not be added
    const lastCallArgs = mockSetSettings.mock.calls.length > 0 ? mockSetSettings.mock.calls.slice(-1)[0][0](createMCPServersProps().settings) : { mcpServers: {} };
    expect(lastCallArgs.mcpServers['env-fail-test']).toBeUndefined();
  });

  it('uses default settings.baseFolderPath for cwd if cwd input is empty and baseFolderPath is set', () => {
    const specificBase = '/test/base/default-cwd';
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: specificBase }
    );
    const { nameInput, commandInput, submitButton } = renderFormAndGetElements(props); // cwdInput not changed by user

    fireEvent.change(nameInput, { target: { value: 'cwd-default-test' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.click(submitButton);

    const newSettingsArg = mockSetSettings.mock.calls.slice(-1)[0][0];
    const updatedSettings = newSettingsArg({ mcpServers: {}, baseFolderPath: specificBase });
    const serverConfig = updatedSettings.mcpServers['cwd-default-test'];
    expect(serverConfig.cwd).toBe(specificBase);
  });

  it('uses specified cwd if provided, ignoring baseFolderPath', () => {
     const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/custom-cwd-ignored' }
    );
    const { nameInput, commandInput, cwdInput, submitButton } = renderFormAndGetElements(props);

    fireEvent.change(nameInput, { target: { value: 'cwd-custom-test' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.change(cwdInput, { target: { value: '/my/specific/path' } });
    fireEvent.click(submitButton);

    const newSettingsArg = mockSetSettings.mock.calls.slice(-1)[0][0];
    const updatedSettings = newSettingsArg({ mcpServers: {}, baseFolderPath: '/test/base/custom-cwd-ignored' });
    const serverConfig = updatedSettings.mcpServers['cwd-custom-test'];
    expect(serverConfig.cwd).toBe('/my/specific/path');
  });

  it('does not add server if name is missing', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/no-name' }
    );
    const { commandInput, submitButton } = renderFormAndGetElements(props);
    fireEvent.change(commandInput, { target: { value: 'cmd' } });
    fireEvent.click(submitButton);
    expect(mockSetSettings).not.toHaveBeenCalled();
    // Optionally, check for a toast message if one is implemented for this validation
  });

  it('does not add server if command is missing', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/no-cmd' }
    );
    const { nameInput, submitButton } = renderFormAndGetElements(props);
    fireEvent.change(nameInput, { target: { value: 'no-cmd-test' } });
    fireEvent.click(submitButton);
    expect(mockSetSettings).not.toHaveBeenCalled();
  });

  it('correctly sets default timeout if input is invalid or empty', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {}, baseFolderPath: '/test/base/timeout' }
    );
    const { nameInput, commandInput, timeoutInput, submitButton } = renderFormAndGetElements(props);

    fireEvent.change(nameInput, { target: { value: 'timeout-test' } });
    fireEvent.change(commandInput, { target: { value: 'cmd' } });

    // Test with empty timeout
    fireEvent.change(timeoutInput, { target: { value: '' } });
    fireEvent.click(submitButton);
    let newSettingsArg = mockSetSettings.mock.calls.slice(-1)[0][0];
    let updatedSettings = newSettingsArg({ mcpServers: {}, baseFolderPath: '/test/base/timeout' });
    let serverConfig = updatedSettings.mcpServers['timeout-test'];
    expect(serverConfig.timeout).toBe(600000);

    // Test with invalid text
    fireEvent.change(timeoutInput, { target: { value: 'abc' } });
    fireEvent.click(submitButton);
    newSettingsArg = mockSetSettings.mock.calls.slice(-1)[0][0];
    updatedSettings = newSettingsArg({ mcpServers: {}, baseFolderPath: '/test/base/timeout' });
    serverConfig = updatedSettings.mcpServers['timeout-test'];
    expect(serverConfig.timeout).toBe(600000);
  });
});

// Minimal describe block for MCPServers itself for now
// More tests for MCPServers will be added in the next step.
describe('MCPServers Component', () => {
  it('renders without crashing', () => {
    render(<MCPServers {...createMCPServersProps()} />);
    expect(screen.getByText('MCP Server Configurations')).toBeInTheDocument();
  });

  it('shows AddMcpServerForm when "Add Server" button is clicked', () => {
    render(<MCPServers {...createMCPServersProps()} />);
    // Initially, the detailed form inputs shouldn't be there
    expect(screen.queryByPlaceholderText('myServer')).not.toBeInTheDocument();

    // Button to open the form
    const openFormButton = screen.getAllByRole('button', { name: /add server/i }).find(
      (btn) => btn.className.includes('bg-blue-600') && btn.textContent.includes('Add Server')
    );
    if (!openFormButton) throw new Error("Could not find the 'Add Server' button to open the form in test.");
    fireEvent.click(openFormButton);

    expect(screen.getByPlaceholderText('myServer')).toBeInTheDocument();
    // Button to submit the form
    const submitFormButton = screen.getAllByRole('button', { name: /add server/i }).find(
      (btn) => btn.className.includes('bg-green-600')
    );
    expect(submitFormButton).toBeInTheDocument();
  });
});

// This is the new, corrected block for MCPServers direct functionality
describe('MCPServers Component - Direct Functionality', () => {
  let mockSetSettings;
  let mockShowToast;
  let user;
  let mockReadJsonFile; // To store the vi.fn() from the mock

  const initialServers = {
    server1: { command: 'cmd1', args: ['arg1'], cwd: '/path1', timeout: 1000, trust: false, env: {} },
    server2: { command: 'cmd2', args: ['arg2', 'arg3'], timeout: 2000, trust: true, env: { VAR: 'val' } },
  };

  beforeEach(async () => {
    user = userEvent.setup();
    mockSetSettings = vi.fn();
    mockShowToast = vi.fn();

    // Import the mocked function here to ensure it's the vi.fn() instance from the module mock
    const utils = await import('./utils/fileUtils');
    mockReadJsonFile = utils.readJsonFile;
    mockReadJsonFile.mockReset(); // Reset call history etc.
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks(); // Restore any other mocks like document.createElement
  });

  it('renders a list of existing MCP servers', () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: initialServers, baseFolderPath: '/test' }
    );
    render(<MCPServers {...props} />);

    expect(screen.getByText('server1')).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('cmd1'))).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('arg1'))).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('/path1'))).toBeInTheDocument();
    expect(screen.getByText('server2')).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('cmd2'))).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('arg2 arg3'))).toBeInTheDocument();
    expect(screen.getByText((content, el) => el.tagName.toLowerCase() === 'code' && content.includes('{"VAR":"val"}'))).toBeInTheDocument();
  });

  it('removes a server when remove button is clicked', async () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: { ...initialServers }, baseFolderPath: '/test' }
    );
    render(<MCPServers {...props} />);
    const server1Card = screen.getByText('server1').closest('.p-4');
    const removeButton = within(server1Card).getByTitle('Remove server');
    await user.click(removeButton);

    expect(mockSetSettings).toHaveBeenCalledTimes(1);
    const updaterFn = mockSetSettings.mock.calls[0][0];
    const newState = updaterFn({ mcpServers: { ...initialServers } });
    expect(newState.mcpServers.server1).toBeUndefined();
    expect(newState.mcpServers.server2).toBeDefined();
    expect(mockShowToast).toHaveBeenCalledWith('MCP server "server1" removed successfully!', 'success');
  });

  it('toggles server trust', async () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: { ...initialServers }, baseFolderPath: '/test' }
    );
    const { rerender } = render(<MCPServers {...props} />);

    let server1Card = screen.getByText('server1').closest('.p-4');
    let trustButton = within(server1Card).getByRole('button', { name: /Untrusted/i });
    expect(trustButton.title).toBe('Click to trust');
    await user.click(trustButton);

    expect(mockSetSettings).toHaveBeenCalledTimes(1);
    let updaterFn = mockSetSettings.mock.calls[0][0];
    let currentSettings = { mcpServers: { ...initialServers } };
    currentSettings = updaterFn(currentSettings);
    expect(currentSettings.mcpServers.server1.trust).toBe(true);
    expect(mockShowToast).toHaveBeenCalledWith('MCP server "server1" trusted', 'success');

    // Update props and rerender to simulate state change for UI
    const propsAfterTrust = createMCPServersProps(
        { setSettings: mockSetSettings, showToast: mockShowToast },
        { mcpServers: currentSettings.mcpServers, baseFolderPath: '/test' }
    );
    rerender(<MCPServers {...propsAfterTrust} />);

    server1Card = screen.getByText('server1').closest('.p-4'); // Re-find the card
    trustButton = within(server1Card).getByRole('button', { name: /Trusted/i });
    expect(trustButton.title).toBe('Click to untrust');
    await user.click(trustButton);

    expect(mockSetSettings).toHaveBeenCalledTimes(2); // Called again
    updaterFn = mockSetSettings.mock.calls[1][0];
    currentSettings = updaterFn(currentSettings); // Pass the already updated settings
    expect(currentSettings.mcpServers.server1.trust).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('MCP server "server1" untrusted', 'success');
  });

  it('toggles server connection (enabled/disabled UI flag)', async () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: { ...initialServers }, baseFolderPath: '/test' }
    );
    render(<MCPServers {...props} />);

    const server1Card = screen.getByText('server1').closest('.p-4');
    let connectButton = within(server1Card).getByRole('button', {name: /Disabled/i });
    await user.click(connectButton);
    expect(mockShowToast).toHaveBeenCalledWith('Enabled "server1" in Gemini CLI config', 'success');

    await waitFor(() => {
        expect(within(server1Card).getByRole('button', {name: /Enabled/i})).toBeInTheDocument();
    });

    const disconnectButton = within(server1Card).getByRole('button', {name: /Enabled/i });
    await user.click(disconnectButton);
    expect(mockShowToast).toHaveBeenCalledWith('Disabled "server1" in Gemini CLI config', 'info');

    await waitFor(() => {
        expect(within(server1Card).getByRole('button', {name: /Disabled/i})).toBeInTheDocument();
    });
  });

  it('imports a valid Gemini CLI MCP config file', async () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: { existingServer: { command: 'old', args:[], env:{}, trust:false, timeout:0 } } }
    );
    render(<MCPServers {...props} />);

    const newConfigData = {
      mcpServers: {
        importedServer1: { command: 'uv', args: ['run', 'mcp-s1'], trust: true, timeout: 60000, env: {} },
        importedServer2: { command: 'node', args: ['s2.js'], env: { PORT: '3000' }, trust: false, timeout: 120000 }
      }
    };
    const file = new File([JSON.stringify(newConfigData)], 'config.json', { type: 'application/json' });
    const importButton = screen.getByText('Import Config').closest('button');

    mockReadJsonFile.mockResolvedValue(newConfigData);

    // This part simulates the component's internal dynamic input creation
    const originalCreateElement = document.createElement;
    const mockInputElement = originalCreateElement.call(document, 'input');
    vi.spyOn(mockInputElement, 'click'); // We just need to know it's called
    let assignedOnChange;
    Object.defineProperty(mockInputElement, 'onchange', {
        configurable: true,
        set(handler) { assignedOnChange = handler; },
        get() { return assignedOnChange; }
    });
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'input') return mockInputElement;
      return originalCreateElement.call(document, tagName);
    });

    await user.click(importButton); // Triggers importMcpConfig
    expect(mockInputElement.click).toHaveBeenCalled(); // Component should have called click()

    // Manually trigger the onchange with the file
    // This simulates the user selecting a file after input.click()
    if (typeof assignedOnChange === 'function') {
      Object.defineProperty(mockInputElement, 'files', { value: [file], configurable: true });
      await assignedOnChange({ target: mockInputElement });
    } else {
      throw new Error('onchange handler was not assigned to mock input');
    }

    await waitFor(() => {
      expect(mockReadJsonFile).toHaveBeenCalledWith(file);
      expect(mockSetSettings).toHaveBeenCalledTimes(1);
    });

    const setSettingsUpdater = mockSetSettings.mock.calls[0][0];
    const prevSettingsForUpdate = { mcpServers: { existingServer: { command: 'old', args:[], env:{}, trust:false, timeout:0 } } };
    const newSettings = setSettingsUpdater(prevSettingsForUpdate);

    expect(newSettings.mcpServers.existingServer).toBeDefined();
    expect(newSettings.mcpServers.importedServer1).toEqual(newConfigData.mcpServers.importedServer1);
    expect(newSettings.mcpServers.importedServer2).toEqual(newConfigData.mcpServers.importedServer2);
    expect(mockShowToast).toHaveBeenCalledWith('Successfully imported 2 MCP server(s)!', 'success');
  });

  it('shows error toast if file reading fails during import', async () => {
    const props = createMCPServersProps(
      { setSettings: mockSetSettings, showToast: mockShowToast },
      { mcpServers: {} }
    );
    render(<MCPServers {...props} />);
    const file = new File(['invalid content'], 'bad.json', { type: 'application/json' });
    const importButton = screen.getByText('Import Config').closest('button');

    const originalCreateElement = document.createElement;
    const mockInputElement = originalCreateElement.call(document, 'input');
    vi.spyOn(mockInputElement, 'click');
    let assignedOnChange;
    Object.defineProperty(mockInputElement, 'onchange', {
        configurable: true,
        set(handler) { assignedOnChange = handler; },
        get() { return assignedOnChange; }
    });
    document.createElement = vi.fn().mockReturnValue(mockInputElement);

    mockReadJsonFile.mockRejectedValue(new Error("Test read error"));

    await user.click(importButton);
    expect(mockInputElement.click).toHaveBeenCalled();

    if (typeof assignedOnChange === 'function') {
      Object.defineProperty(mockInputElement, 'files', { value: [file], configurable: true });
      await assignedOnChange({ target: mockInputElement });
    } else {
      throw new Error('onchange handler was not assigned to mock input for error test');
    }

    await waitFor(() => {
      expect(mockReadJsonFile).toHaveBeenCalledWith(file);
      expect(mockShowToast).toHaveBeenCalledWith('Failed to import MCP configuration: Test read error', 'error');
    });
    expect(mockSetSettings).not.toHaveBeenCalled();
  });
});

// Note: To run these tests, App.jsx might need to export MCPServers.
// If AddMcpServerForm is not exported, these tests for it are indirect
// via MCPServers. Extracting AddMcpServerForm would simplify its direct testing.
// For now, I'm assuming MCPServers can be imported. If not, I'll get an error
// during test execution and adjust.
