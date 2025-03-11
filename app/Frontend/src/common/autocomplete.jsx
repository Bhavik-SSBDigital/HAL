import { useState } from 'react';
// import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { IconChevronDown, IconX } from '@tabler/icons-react';

export default function MultiSelectAutocomplete({
  options = [{ id: 1, name: 'viraj' }],
  onChange,
}) {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = query
    ? options.filter((opt) =>
        opt.name.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  function toggleSelection(option) {
    setSelected((prev) => {
      const select = prev.some((item) => item === option)
        ? prev.filter((item) => item !== option)
        : [...prev, option];
      onChange(select);
      return select;
    });
  }

  return (
    <div className="relative mx-auto w-full">
      {/* Input Field */}
      <div
        className="flex items-center hover:bg-zinc-200 rounded-xl min-h-12 py-2 px-3 cursor-pointer bg-zinc-100 w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-grow">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span
                key={item.id}
                className="flex items-center bg-blue-500 text-white px-2 py-1 rounded-md text-sm"
              >
                {item.name}
                <IconX
                  className="w-4 h-4 ml-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(item.id);
                  }}
                />
              </span>
            ))
          ) : (
            <span className="text-gray-400">Search & select...</span>
          )}
        </div>
        <IconChevronDown size={16} className="text-gray-500" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-1 mt-1 w-full bg-white border border-slate-200 shadow-lg rounded-lg max-h-60 overflow-auto">
          <input
            type="text"
            className="w-full p-2 border-b outline-none"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul>
            {filteredOptions.map((option) => (
              <li
                key={option.id}
                className={`cursor-pointer m-2 rounded-md px-3 py-1 ${
                  selected.some((item) => item.id === option.id)
                    ? 'bg-blue-300 text-white'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => toggleSelection(option.id)}
              >
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
