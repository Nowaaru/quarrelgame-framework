local exports = {};

function exports.getEnumValues(enumObject)
    local result = {}
    local length = 0

    for key, value in pairs(enumObject) do
        table.insert(result, { key, value });
    end

    return result
end


return exports;