import { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { execa } from 'execa';
import { loadConfig } from '../../config';

interface Submodule {
  name: string;
  url: string;
  commit: string;
  status: string;
  lastCommitMessage?: string;
}

interface ListSubmodulesProps {
  _originalCwd?: string;
}

function ListSubmodules({ _originalCwd }: ListSubmodulesProps) {
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listSubmodules = async () => {
      try {
        const { stdout } = await execa('git', ['submodule', 'status'], {
          cwd: _originalCwd || process.cwd()
        });
        
        if (!stdout.trim()) {
          setSubmodules([]);
          setLoading(false);
          setTimeout(() => process.exit(0), 1000);
          return;
        }

        const config = loadConfig();
        const modules = await Promise.all(
          stdout.split('\n').map(async (line) => {
            const match = line.match(/^(.)([\da-f]+)\s+(\S+)(?:\s+\((.+)\))?/);
            if (match) {
              const [, statusChar, commit, path, branch] = match;
              const name = path.replace(`${config.submodules}/`, '');
              
              // Get the last commit message from the submodule
              let lastCommitMessage = '';
              try {
                const submodulePath = `${_originalCwd || process.cwd()}/${path}`;
                const { stdout: commitMsg } = await execa('git', ['log', '-1', '--pretty=format:%s'], {
                  cwd: submodulePath
                });
                lastCommitMessage = commitMsg.trim();
              } catch {
                lastCommitMessage = 'No commit message';
              }
              
              return {
                name,
                url: '', // We'd need to parse .gitmodules for URL
                commit: commit.substring(0, 8),
                status: statusChar === ' ' ? 'clean' : statusChar === '+' ? 'modified' : 'other',
                lastCommitMessage
              };
            }
            return null;
          })
        );
        
        const validModules = modules.filter(Boolean) as Submodule[];

        setSubmodules(validModules);
        setLoading(false);
        setTimeout(() => process.exit(0), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        setTimeout(() => process.exit(1), 2000);
      }
    };

    listSubmodules();
  }, []);

  if (loading) {
    return <Text color="yellow">Loading submodules...</Text>;
  }

  if (error) {
    return <Text color="red">❌ Error: {error}</Text>;
  }

  if (submodules.length === 0) {
    return <Text color="gray">No submodules found</Text>;
  }

  return (
    <Box flexDirection="column">
      {submodules.map((sub, index) => (
        <Box key={index} marginTop={1} flexDirection="column">
          <Box>
            <Text color="green">• {sub.name}</Text>
            <Text color="gray"> ({sub.commit})</Text>
            {sub.status !== 'clean' && <Text color="yellow"> [{sub.status}]</Text>}
          </Box>
          {sub.lastCommitMessage && (
            <Box marginLeft={2}>
              <Text color="dim">{sub.lastCommitMessage}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export const list = {
  name: 'list',
  description: 'List all submodules',
  args: [],
  example: 'list',
  component: ListSubmodules,
  validate: () => ({ valid: true })
};
