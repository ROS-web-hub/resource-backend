
class HelperMethods
{
    static requestIdsToArray(requestId){
        const ids = requestId ? requestId.split(",") : [];
        if(ids.length == 1 && ids[0] == ''){
            return [];
        }

        return ids;
    }
}

module.exports = HelperMethods;